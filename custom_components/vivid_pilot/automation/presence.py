# ====== Code Summary ======
# PresenceAutomation: presence-based lighting, per room, configured in the
# panel. When presence appears in a room whose lights are all off, the room
# is turned on (its memory is restored). When the room has been empty for
# the configured delay, its lights are turned off. Off by default.

from __future__ import annotations

import logging
from collections import defaultdict
from collections.abc import Callable
from typing import Any

from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

from ..control import GroupController
from ..nodes import NodeKey
from ..storage import PilotStore
from ..tree import Category, HomeTree

_LOGGER = logging.getLogger(__name__)

DEFAULT_DELAY_MINUTES = 5


class PresenceAutomation:
    """Turn rooms on with presence and off after a delay without presence."""

    def __init__(
        self,
        hass: HomeAssistant,
        store: PilotStore,
        groups: GroupController,
        on_change: Callable[[], None],
    ) -> None:
        self._hass = hass
        self._store = store
        self._groups = groups
        self._on_change = on_change
        self._sensors: dict[str, list[str]] = {}
        self._timers: dict[str, CALLBACK_TYPE] = {}
        self._unsubscribe: CALLBACK_TYPE | None = None

    # ====== Settings ======

    def settings(self, area_id: str) -> dict[str, Any]:
        raw = self._store.data.presence.get(area_id, {})
        return {
            "enabled": bool(raw.get("enabled", False)),
            "delay": int(raw.get("delay", DEFAULT_DELAY_MINUTES)),
            "sensors": self._sensors.get(area_id, []),
            "available": area_id in self._sensors,
        }

    @callback
    def update(self, area_id: str, enabled: bool | None = None, delay: int | None = None) -> None:
        raw = self._store.data.presence.setdefault(area_id, {})
        if enabled is not None:
            raw["enabled"] = enabled
        if delay is not None:
            raw["delay"] = max(1, int(delay))
        self._store.schedule_save()
        self._on_change()

    # ====== Lifecycle ======

    @callback
    def async_rebuild(self, tree: HomeTree) -> None:
        """Follow the presence sensors of rooms that also have lights."""
        sensors: dict[str, list[str]] = defaultdict(list)
        for room in tree.rooms:
            categories = {node.category: node for node in room.categories}
            presence = categories.get(Category.PRESENCE)
            if presence and (Category.LIGHT in categories or Category.LED in categories):
                sensors[room.area_id] = [leaf.entity_id for leaf in presence.leaves]
        self._sensors = dict(sensors)
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
        watched = sorted({entity_id for ids in self._sensors.values() for entity_id in ids})
        if watched:
            self._unsubscribe = async_track_state_change_event(self._hass, watched, self._on_state)

    @callback
    def async_stop(self) -> None:
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
        for cancel in self._timers.values():
            cancel()
        self._timers.clear()

    # ====== Behaviour ======

    def _occupied(self, area_id: str) -> bool:
        return any(
            (state := self._hass.states.get(entity_id)) is not None and state.state == "on"
            for entity_id in self._sensors.get(area_id, [])
        )

    @callback
    def _on_state(self, event: Event[Any]) -> None:
        entity_id = event.data["entity_id"]
        for area_id, ids in self._sensors.items():
            if entity_id in ids and self.settings(area_id)["enabled"]:
                self._react(area_id)

    @callback
    def _react(self, area_id: str) -> None:
        key = NodeKey(area_id=area_id)
        if self._occupied(area_id):
            if cancel := self._timers.pop(area_id, None):
                cancel()
            if not self._groups.is_on(key):
                _LOGGER.info("START presence turn on (area=%s)", area_id)
                self._hass.async_create_task(self._groups.async_turn_on(key))
            return
        if area_id in self._timers:
            return

        @callback
        def _fire(_now: Any) -> None:
            self._timers.pop(area_id, None)
            if self.settings(area_id)["enabled"] and not self._occupied(area_id):
                _LOGGER.info("START presence turn off (area=%s)", area_id)
                self._hass.async_create_task(self._groups.async_turn_off(key))

        self._timers[area_id] = async_call_later(
            self._hass, self.settings(area_id)["delay"] * 60, _fire
        )
