# ====== Code Summary ======
# PilotRuntime: the composition root of the integration. It builds every
# object once (store, tree, panel, websocket API) with its injected settings,
# starts them on setup and stops them on unload. Later modules (entities,
# memory, automations, utilities) are built and started here too.

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .api import PilotWebsocketApi, WebsocketCommands
from .const import (
    DOMAIN,
    EXCLUDED_PLATFORMS,
    PANEL_BUNDLE_FILE,
    PANEL_ELEMENT_NAME,
    PANEL_FRONTEND_DIR,
    PANEL_ICON,
    PANEL_STATIC_URL,
    PANEL_TITLE,
    PANEL_URL_PATH,
    STORAGE_KEY,
    STORAGE_VERSION,
    STRIP_PLATFORMS,
    TREE_DEBOUNCE_SECONDS,
    WS_TYPE_INFO,
    WS_TYPE_TREE_GET,
    WS_TYPE_TREE_SUBSCRIBE,
)
from .panel import PanelRegistrar, PanelSettings
from .storage import PilotStore
from .tree import CategoryDetector, DetectorSettings, PilotTree, TreeBuilder

_LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class PilotRuntime:
    """Every live object of one Vivid Pilot config entry."""

    version: str
    store: PilotStore
    tree: PilotTree
    panel: PanelRegistrar
    api: PilotWebsocketApi

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
        api = PilotWebsocketApi(
            hass,
            store,
            tree,
            version,
            WebsocketCommands(
                info=WS_TYPE_INFO,
                tree_get=WS_TYPE_TREE_GET,
                tree_subscribe=WS_TYPE_TREE_SUBSCRIBE,
            ),
        )
        return cls(version=version, store=store, tree=tree, panel=panel, api=api)

    async def async_start(self) -> None:
        """Load the data, build the tree, then expose the API and the panel."""
        _LOGGER.info("START vivid_pilot runtime (version=%s)", self.version)
        await self.store.load()
        self.tree.async_start()
        self.api.register()
        await self.panel.register()
        _LOGGER.info("END vivid_pilot runtime start (rooms=%d)", len(self.tree.tree.rooms))

    async def async_stop(self) -> None:
        """Remove the panel, stop the tree and flush the data to disk."""
        _LOGGER.info("START vivid_pilot runtime stop")
        self.panel.unregister()
        self.tree.async_stop()
        await self.store.save()
        _LOGGER.info("END vivid_pilot runtime stop")
