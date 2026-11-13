# ====== Code Summary ======
# PilotTree: keeps the current HomeTree up to date. It builds the tree once
# on start, rebuilds it (debounced) whenever the entity, device or area
# registry changes, and notifies subscribers (e.g. the panel) of each new tree.

from __future__ import annotations

import contextlib
import logging
from collections.abc import Callable, Mapping
from typing import Any

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.debounce import Debouncer

from .builder import TreeBuilder
from .model import HomeTree

_LOGGER = logging.getLogger(__name__)

type TreeListener = Callable[[HomeTree], None]


class PilotTree:
    """Live tree: rebuilt on registry changes, observable by subscribers."""

    def __init__(
        self,
        hass: HomeAssistant,
        builder: TreeBuilder,
        overrides: Callable[[], Mapping[str, Mapping[str, Any]]],
        debounce_seconds: float,
    ) -> None:
        self._hass = hass
        self._builder = builder
        self._overrides = overrides
        self._tree = HomeTree()
        self._listeners: list[TreeListener] = []
        self._unsubscribers: list[CALLBACK_TYPE] = []
        self._debouncer: Debouncer[None] = Debouncer(
            hass,
            _LOGGER,
            cooldown=debounce_seconds,
            immediate=False,
            function=self._async_rebuild,
        )

    @property
    def tree(self) -> HomeTree:
        """Return the latest tree."""
        return self._tree

    @callback
    def async_start(self) -> None:
        """Build the tree now and follow the registries."""
        _LOGGER.debug("START tree engine")
        self._tree = self._builder.build(self._overrides())
        for event_type in (
            er.EVENT_ENTITY_REGISTRY_UPDATED,
            dr.EVENT_DEVICE_REGISTRY_UPDATED,
            ar.EVENT_AREA_REGISTRY_UPDATED,
        ):
            self._unsubscribers.append(self._hass.bus.async_listen(event_type, self._on_change))
        # At boot other integrations are still loading (their entities look
        # "restored"): rebuild once Home Assistant has fully started.
        if not self._hass.is_running:
            self._unsubscribers.append(
                self._hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, self._on_change)
            )
        _LOGGER.debug("END tree engine start (rooms=%d)", len(self._tree.rooms))

    @callback
    def async_stop(self) -> None:
        """Stop following the registries and drop the listeners."""
        for unsubscribe in self._unsubscribers:
            # A one-shot listener that already fired cannot be removed twice.
            with contextlib.suppress(ValueError):
                unsubscribe()
        self._unsubscribers.clear()
        self._listeners.clear()
        self._debouncer.async_shutdown()

    @callback
    def async_subscribe(self, listener: TreeListener) -> CALLBACK_TYPE:
        """Call listener with every new tree; return the unsubscribe callback."""
        self._listeners.append(listener)

        @callback
        def _unsubscribe() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return _unsubscribe

    @callback
    def async_rebuild_now(self) -> None:
        """Rebuild immediately (after a manual correction)."""
        self._hass.async_create_task(self._async_rebuild())

    async def async_request_rebuild(self) -> None:
        """Ask for a rebuild (debounced), e.g. after an override changed."""
        await self._debouncer.async_call()

    @callback
    def _on_change(self, _event: Event[Any]) -> None:
        """A registry changed: schedule a debounced rebuild."""
        self._hass.async_create_task(self._debouncer.async_call())

    async def _async_rebuild(self) -> None:
        """Rebuild the tree and notify subscribers."""
        self._tree = self._builder.build(self._overrides())
        for listener in list(self._listeners):
            listener(self._tree)
