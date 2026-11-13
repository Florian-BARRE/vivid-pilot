# ====== Code Summary ======
# Group entities of the tree:
#   LightGroupEntity   a node's lights / LEDs (home, room, room/light, room/led)
#   SwitchGroupEntity  a room's switches
# Turning a group on with no parameter restores the node's memory when it has
# one; with parameters (brightness...) it behaves like a normal group. State
# and brightness are computed from the real members.

from __future__ import annotations

from typing import Any

from homeassistant.components.light import ATTR_BRIGHTNESS, ColorMode, LightEntity
from homeassistant.components.switch import SwitchEntity

from .base import PilotEntity


class _GroupMixin(PilotEntity):
    """Shared state of the group entities."""

    @property
    def _members(self) -> list[str]:
        return self._ctx.groups.members(self.spec.node)

    @property
    def available(self) -> bool:
        return bool(self._members)

    @property
    def is_on(self) -> bool:
        return self._ctx.groups.is_on(self.spec.node)

    def _attributes(self) -> dict[str, Any]:
        # "entity_id" makes the frontend show the members, like core groups.
        return {"entity_id": self._members}

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._ctx.groups.async_turn_off(self.spec.node, context=self._context)


class LightGroupEntity(_GroupMixin, LightEntity):
    """A node's lights as one light."""

    _attr_supported_color_modes = frozenset({ColorMode.BRIGHTNESS})
    _attr_color_mode = ColorMode.BRIGHTNESS

    @property
    def brightness(self) -> int | None:
        values = []
        for entity_id in self._members:
            state = self.hass.states.get(entity_id)
            if state and state.state == "on":
                values.append(state.attributes.get(ATTR_BRIGHTNESS) or 255)
        return round(sum(values) / len(values)) if values else None

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._ctx.groups.async_turn_on(self.spec.node, context=self._context, **kwargs)


class SwitchGroupEntity(_GroupMixin, SwitchEntity):
    """A room's switches as one switch."""

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._ctx.groups.async_turn_on(self.spec.node, context=self._context)
