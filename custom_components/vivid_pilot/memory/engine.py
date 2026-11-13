# ====== Code Summary ======
# MemoryEngine: the last light state of every node, kept up to date.
# Each memory-enabled node watches its memory members; any state or attribute
# change restarts a per-node debounce timer, and when the node has settled
# its state is stored — only if at least one member is on and none is
# unavailable (never an "all off" state). Memories persist in the store and
# are restored through Home Assistant's reproduce-state machinery (the one
# scenes use).

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from homeassistant.core import CALLBACK_TYPE, Context, Event, HomeAssistant, State, callback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.helpers.state import async_reproduce_state
from homeassistant.util import dt as dt_util

from ..nodes import NodeKey, NodeMembers
from ..storage import PilotStore

_LOGGER = logging.getLogger(__name__)

UNAVAILABLE = {"unavailable", "unknown"}
ON_STATES = {"on"}
# Only what a light needs to come back the same; reproduce_state ignores the rest.
KEPT_ATTRIBUTES = (
    "brightness",
    "color_mode",
    "color_temp_kelvin",
    "hs_color",
    "rgb_color",
    "rgbw_color",
    "rgbww_color",
    "xy_color",
    "effect",
)


class MemoryEngine:
    """Capture, persist and restore the state of each node."""

    def __init__(
        self,
        hass: HomeAssistant,
        store: PilotStore,
        on_change: Callable[[], None],
        default_debounce: float,
    ) -> None:
        self._hass = hass
        self._store = store
        self._on_change = on_change
        self._default_debounce = default_debounce
        self._members: dict[str, list[str]] = {}
        self._timers: dict[str, CALLBACK_TYPE] = {}
        self._unsubscribe: CALLBACK_TYPE | None = None

    # ====== Settings ======

    @property
    def master(self) -> bool:
        return bool(self._store.data.settings.get("memory_master", True))

    @property
    def debounce(self) -> float:
        return float(self._store.data.settings.get("memory_debounce", self._default_debounce))

    def members(self, key: NodeKey) -> list[str]:
        return list(self._members.get(str(key), []))

    def is_active(self, key: NodeKey) -> bool:
        return self.master and bool(self._members.get(str(key)))

    # ====== Lifecycle ======

    @callback
    def async_rebuild(self, members: NodeMembers) -> None:
        """Follow the memory members of every node of a new tree."""
        self._members = (
            {str(key): members.memory(key) for key in members.memory_nodes()} if self.master else {}
        )
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
        watched = sorted({entity_id for ids in self._members.values() for entity_id in ids})
        if watched:
            self._unsubscribe = async_track_state_change_event(self._hass, watched, self._on_state)
        _LOGGER.debug("END memory rebuild (nodes=%d, watched=%d)", len(self._members), len(watched))

    @callback
    def async_stop(self) -> None:
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
        for cancel in self._timers.values():
            cancel()
        self._timers.clear()

    # ====== Capture ======

    @callback
    def _on_state(self, event: Event[Any]) -> None:
        entity_id = event.data["entity_id"]
        for key, ids in self._members.items():
            if entity_id in ids:
                self._schedule(key)

    @callback
    def _schedule(self, key: str) -> None:
        if cancel := self._timers.pop(key, None):
            cancel()

        @callback
        def _fire(_now: Any) -> None:
            self._timers.pop(key, None)
            self.capture(NodeKey.parse(key))

        self._timers[key] = async_call_later(self._hass, self.debounce, _fire)

    @callback
    def capture(self, key: NodeKey) -> bool:
        """Store the node's current state if it is worth keeping; tell whether it did."""
        ids = self._members.get(str(key), [])
        states = [self._hass.states.get(entity_id) for entity_id in ids]
        if not ids or any(state is None or state.state in UNAVAILABLE for state in states):
            return False
        if not any(state.state in ON_STATES for state in states if state is not None):
            return False
        self._store.data.memories[str(key)] = {
            "saved_at": dt_util.utcnow().isoformat(),
            "states": {state.entity_id: _snapshot(state) for state in states if state is not None},
        }
        self._store.schedule_save()
        _LOGGER.debug("END memory capture (node=%s, members=%d)", key, len(ids))
        self._on_change()
        return True

    # ====== Restore / forget ======

    def stored(self, key: NodeKey) -> dict[str, Any] | None:
        return self._store.data.memories.get(str(key))

    async def async_restore(self, key: NodeKey, context: Context | None = None) -> bool:
        """Bring the node back to its stored state; False when nothing is stored."""
        memory = self.stored(key)
        if not memory or not memory.get("states"):
            return False
        _LOGGER.info("START memory restore (node=%s)", key)
        states = [
            State(entity_id, data["state"], data.get("attributes", {}))
            for entity_id, data in memory["states"].items()
        ]
        await async_reproduce_state(self._hass, states, context=context)
        _LOGGER.info("END memory restore (node=%s, entities=%d)", key, len(states))
        return True

    @callback
    def forget(self, key: NodeKey) -> None:
        if self._store.data.memories.pop(str(key), None) is not None:
            self._store.schedule_save()
            self._on_change()

    def summary(self, key: NodeKey) -> dict[str, Any]:
        """What the panel shows about a node's memory."""
        memory = self.stored(key) or {}
        states = memory.get("states", {})
        colors = [
            data.get("attributes", {}).get("rgb_color")
            for data in states.values()
            if data.get("state") in ON_STATES
        ]
        return {
            "active": self.is_active(key),
            "saved_at": memory.get("saved_at"),
            "count": len(states),
            "on": sum(1 for data in states.values() if data.get("state") in ON_STATES),
            "colors": [color for color in colors if color],
            "members": self.members(key),
        }


def _snapshot(state: State) -> dict[str, Any]:
    attributes = {
        name: _jsonable(state.attributes[name])
        for name in KEPT_ATTRIBUTES
        if state.attributes.get(name) is not None
    }
    return {"state": state.state, "attributes": attributes}


def _jsonable(value: Any) -> Any:
    if isinstance(value, tuple):
        return list(value)
    return value
