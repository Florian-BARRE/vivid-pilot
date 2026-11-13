# ====== Code Summary ======
# PilotRuntime: the composition root of the integration. It builds every
# object once with its injected settings, wires them together and drives
# them: each new tree updates the power model, the memories and the
# generated entities, then refreshes the panel. Any state
# change of a tree entity refreshes the generated entities.

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.loader import async_get_integration

from .api import PanelHub, PayloadBuilder, PilotServices, PilotWebsocketApi
from .const import (
    CURRENT_TRANSLATION_KEYS,
    DEFAULT_STRIP_VOLTAGE,
    DOMAIN,
    EXCLUDED_PLATFORMS,
    HOME_DEVICE_NAME,
    MEMORY_DEBOUNCE_SECONDS,
    PANEL_BUNDLE_FILE,
    PANEL_ELEMENT_NAME,
    PANEL_FRONTEND_DIR,
    PANEL_ICON,
    PANEL_STATIC_URL,
    PANEL_TITLE,
    PANEL_URL_PATH,
    SIGNAL_REFRESH,
    STORAGE_KEY,
    STORAGE_VERSION,
    STRIP_PLATFORMS,
    TREE_DEBOUNCE_SECONDS,
)
from .control import GroupController
from .entities import FACTORIES, EntityCatalog, EntitySpec, EntitySync, PilotContext
from .memory import MemoryEngine
from .nodes import NodeMembers
from .panel import PanelRegistrar, PanelSettings
from .power import PowerModel, PowerSettings
from .storage import PilotStore
from .tree import CategoryDetector, DetectorSettings, HomeTree, PilotTree, TreeBuilder

_LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class PilotRuntime:
    """Every live object of one Vivid Pilot config entry."""

    hass: HomeAssistant
    version: str
    store: PilotStore
    tree: PilotTree
    power: PowerModel
    memory: MemoryEngine
    groups: GroupController
    catalog: EntityCatalog
    entities: EntitySync
    hub: PanelHub
    panel: PanelRegistrar
    api: PilotWebsocketApi
    services: PilotServices
    specs: list[EntitySpec] = field(default_factory=list)
    _unsubscribers: list[CALLBACK_TYPE] = field(default_factory=list)
    _untrack: CALLBACK_TYPE | None = None

    @classmethod
    async def async_create(cls, hass: HomeAssistant) -> PilotRuntime:
        """Build the runtime; the manifest is the single source of the version."""
        integration = await async_get_integration(hass, DOMAIN)
        version = str(integration.version)
        store = PilotStore(hass, STORAGE_KEY, STORAGE_VERSION)
        detector = CategoryDetector(
            DetectorSettings(
                own_platform=DOMAIN,
                strip_platforms=STRIP_PLATFORMS,
                excluded_platforms=EXCLUDED_PLATFORMS,
            )
        )
        tree = PilotTree(
            hass,
            TreeBuilder(hass, detector),
            overrides=lambda: store.data.overrides,
            debounce_seconds=TREE_DEBOUNCE_SECONDS,
        )

        def members() -> NodeMembers:
            return NodeMembers(tree.tree, store.data.nodes)

        hub = PanelHub(hass)
        memory = MemoryEngine(hass, store, hub.notify, MEMORY_DEBOUNCE_SECONDS)
        groups = GroupController(hass, memory, members)
        power = PowerModel(
            hass,
            PowerSettings(
                strip_platforms=STRIP_PLATFORMS,
                current_translation_keys=CURRENT_TRANSLATION_KEYS,
                default_voltage=DEFAULT_STRIP_VOLTAGE,
            ),
        )
        context = PilotContext(
            hass=hass,
            domain=DOMAIN,
            signal=SIGNAL_REFRESH,
            members=members,
            groups=groups,
            memory=memory,
            power=power,
        )
        panel = PanelRegistrar(
            hass,
            PanelSettings(
                url_path=PANEL_URL_PATH,
                element_name=PANEL_ELEMENT_NAME,
                title=PANEL_TITLE,
                icon=PANEL_ICON,
                static_url=PANEL_STATIC_URL,
                bundle_dir=Path(__file__).parent / PANEL_FRONTEND_DIR,
                bundle_file=PANEL_BUNDLE_FILE,
                version=version,
            ),
        )
        runtime = cls(
            hass=hass,
            version=version,
            store=store,
            tree=tree,
            power=power,
            memory=memory,
            groups=groups,
            catalog=EntityCatalog(HOME_DEVICE_NAME),
            entities=EntitySync(hass, context, FACTORIES),
            hub=hub,
            panel=panel,
            api=None,  # type: ignore[arg-type]  # set right below (needs the runtime)
            services=None,  # type: ignore[arg-type]
        )
        runtime.api = PilotWebsocketApi(hass, runtime, DOMAIN)
        runtime.services = PilotServices(hass, runtime, DOMAIN)
        hub.set_builder(PayloadBuilder(hass, runtime, DOMAIN))
        return runtime

    # ====== Lifecycle ======

    async def async_start(self) -> None:
        """Load the data, build the tree, then expose the API and the panel."""
        _LOGGER.info("START vivid_pilot runtime (version=%s)", self.version)
        await self.store.load()
        self._unsubscribers.append(self.tree.async_subscribe(self._on_tree))
        self.tree.async_start()
        self._on_tree(self.tree.tree)
        self.api.register()
        self.services.register()
        await self.panel.register()
        _LOGGER.info("END vivid_pilot runtime start (rooms=%d)", len(self.tree.tree.rooms))

    async def async_stop(self) -> None:
        """Remove the panel, stop every engine and flush the data to disk."""
        _LOGGER.info("START vivid_pilot runtime stop")
        self.panel.unregister()
        self.services.unregister()
        for unsubscribe in self._unsubscribers:
            unsubscribe()
        if self._untrack:
            self._untrack()
        self.memory.async_stop()
        self.tree.async_stop()
        self.hub.async_stop()
        await self.store.save()
        _LOGGER.info("END vivid_pilot runtime stop")

    # ====== Wiring ======

    def members(self) -> NodeMembers:
        return NodeMembers(self.tree.tree, self.store.data.nodes)

    @callback
    def apply(self) -> None:
        """Settings changed without a new tree: refresh what depends on them."""
        self._on_tree(self.tree.tree)

    @callback
    def _on_tree(self, tree: HomeTree) -> None:
        members = self.members()
        self.power.rebuild(tree)
        self.memory.async_rebuild(members)
        self.specs = self.catalog.build(tree, members, self.power)
        self.entities.update(self.specs)
        self._track(tree)
        self.hub.notify()

    @callback
    def _track(self, tree: HomeTree) -> None:
        """Refresh generated entities whenever a tree entity changes."""
        if self._untrack:
            self._untrack()
            self._untrack = None
        watched = {
            leaf.entity_id
            for room in tree.rooms
            for node in room.categories
            for leaf in node.leaves
        }
        watched |= self.power.inputs()
        if watched:
            self._untrack = async_track_state_change_event(
                self.hass, sorted(watched), self._on_state
            )

    @callback
    def _on_state(self, _event: Event) -> None:
        async_dispatcher_send(self.hass, SIGNAL_REFRESH)
