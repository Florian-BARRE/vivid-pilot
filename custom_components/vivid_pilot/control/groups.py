# ====== Code Summary ======
# GroupController: turns a node's group on and off. Turning a node on with no
# parameter restores its memory when it has one; otherwise the command goes
# straight to the real entities (never through nested groups). Used by the
# generated group entities, the services and the panel.

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import Context, HomeAssistant

from ..memory import MemoryEngine
from ..nodes import LIGHT_CATEGORIES, NodeKey, NodeMembers
from ..tree import Category

_LOGGER = logging.getLogger(__name__)


class GroupController:
    """Drive the members of a node's group."""

    def __init__(
        self,
        hass: HomeAssistant,
        memory: MemoryEngine,
        members: Callable[[], NodeMembers],
    ) -> None:
        self._hass = hass
        self._memory = memory
        self._members = members

    def categories(self, key: NodeKey) -> tuple[Category, ...]:
        """What a node's group drives: its own category, else lights + LEDs."""
        return (key.category,) if key.category is not None else LIGHT_CATEGORIES

    def members(self, key: NodeKey) -> list[str]:
        return self._members().group(key, self.categories(key))

    def is_on(self, key: NodeKey) -> bool:
        return any(self._state(entity_id) == "on" for entity_id in self.members(key))

    async def async_turn_on(
        self, key: NodeKey, context: Context | None = None, **kwargs: Any
    ) -> None:
        """Restore the memory (no parameter) or turn every member on."""
        _LOGGER.debug("START group turn_on (node=%s, params=%s)", key, sorted(kwargs))
        if (
            not kwargs
            and self._memory.is_active(key)
            and await self._memory.async_restore(key, context)
        ):
            return
        lights = [e for e in self.members(key) if e.startswith("light.")]
        others = [e for e in self.members(key) if not e.startswith("light.")]
        if lights:
            await self._hass.services.async_call(
                "light",
                "turn_on",
                {ATTR_ENTITY_ID: lights, **kwargs},
                blocking=True,
                context=context,
            )
        if others:
            await self._hass.services.async_call(
                "homeassistant", "turn_on", {ATTR_ENTITY_ID: others}, blocking=True, context=context
            )

    async def async_turn_off(self, key: NodeKey, context: Context | None = None) -> None:
        """Turn every member off."""
        _LOGGER.debug("START group turn_off (node=%s)", key)
        members = self.members(key)
        if members:
            await self._hass.services.async_call(
                "homeassistant",
                "turn_off",
                {ATTR_ENTITY_ID: members},
                blocking=True,
                context=context,
            )

    def _state(self, entity_id: str) -> str | None:
        state = self._hass.states.get(entity_id)
        return state.state if state else None
