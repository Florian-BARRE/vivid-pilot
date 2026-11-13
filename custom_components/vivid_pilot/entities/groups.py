# ====== Code Summary ======
# Group entities of the tree:
#   LightGroupEntity   a node's lights / LEDs (home, room, room/light, room/led)
#   SwitchGroupEntity  a room's switches
# Turning a group on with no parameter restores the node's memory when it has
# one; with parameters (brightness...) it behaves like a normal group. State
# and brightness are computed from the real members; a light group also offers
# the colors, color temperatures and effects of its members (MergedLight).

from __future__ import annotations

from typing import Any

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ColorMode,
    LightEntity,
    LightEntityFeature,
)
from homeassistant.components.switch import SwitchEntity

from .base import PilotEntity
from .merged_light import MergedLight


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

    def _merged(self) -> MergedLight:
        states = (self.hass.states.get(entity_id) for entity_id in self._members)
        return MergedLight.of(state for state in states if state is not None)

    @property
    def supported_color_modes(self) -> set[ColorMode]:
        return self._merged().supported_color_modes

    @property
    def color_mode(self) -> ColorMode | None:
        return self._merged().color_mode

    @property
    def hs_color(self) -> tuple[float, float] | None:
        return self._merged().hs_color

    @property
    def rgb_color(self) -> tuple[int, int, int] | None:
        return self._merged().rgb_color

    @property
    def rgbw_color(self) -> tuple[int, int, int, int] | None:
        return self._merged().rgbw_color

    @property
    def rgbww_color(self) -> tuple[int, int, int, int, int] | None:
        return self._merged().rgbww_color

    @property
    def xy_color(self) -> tuple[float, float] | None:
        return self._merged().xy_color

    @property
    def color_temp_kelvin(self) -> int | None:
        return self._merged().color_temp_kelvin

    @property
    def min_color_temp_kelvin(self) -> int:
        return self._merged().min_color_temp_kelvin

    @property
    def max_color_temp_kelvin(self) -> int:
        return self._merged().max_color_temp_kelvin

    @property
    def effect_list(self) -> list[str] | None:
        return self._merged().effect_list

    @property
    def effect(self) -> str | None:
        return self._merged().effect

    @property
    def supported_features(self) -> LightEntityFeature:
        features = LightEntityFeature.TRANSITION
        if self._merged().effect_list:
            features |= LightEntityFeature.EFFECT
        return features

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
