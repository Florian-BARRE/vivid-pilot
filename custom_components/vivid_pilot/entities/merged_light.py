# ====== Code Summary ======
# MergedLight: the color capabilities and color state of a set of lights,
# merged the way Home Assistant's own light groups merge them, so a Vivid Pilot
# group offers the colors, color temperatures and effects of its members.

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from homeassistant.components.light import (
    ATTR_COLOR_MODE,
    ATTR_COLOR_TEMP_KELVIN,
    ATTR_EFFECT,
    ATTR_EFFECT_LIST,
    ATTR_HS_COLOR,
    ATTR_MAX_COLOR_TEMP_KELVIN,
    ATTR_MIN_COLOR_TEMP_KELVIN,
    ATTR_RGB_COLOR,
    ATTR_RGBW_COLOR,
    ATTR_RGBWW_COLOR,
    ATTR_SUPPORTED_COLOR_MODES,
    ATTR_XY_COLOR,
    ColorMode,
    filter_supported_color_modes,
)
from homeassistant.const import STATE_ON
from homeassistant.core import State

# ==================================================================================================
# Constants
# ==================================================================================================

DEFAULT_MIN_KELVIN = 2000
DEFAULT_MAX_KELVIN = 6500
# Reported last when several modes are in use: they carry no color.
_PLAIN_MODES = (ColorMode.BRIGHTNESS, ColorMode.ONOFF)


# ==================================================================================================
# Merged state
# ==================================================================================================


@dataclass(frozen=True)
class MergedLight:
    """Color capabilities of every member, color state of the members that are on."""

    supported_color_modes: set[ColorMode]
    color_mode: ColorMode
    hs_color: tuple[float, float] | None
    rgb_color: tuple[int, int, int] | None
    rgbw_color: tuple[int, int, int, int] | None
    rgbww_color: tuple[int, int, int, int, int] | None
    xy_color: tuple[float, float] | None
    color_temp_kelvin: int | None
    min_color_temp_kelvin: int
    max_color_temp_kelvin: int
    effect_list: list[str] | None
    effect: str | None

    @classmethod
    def of(cls, states: Iterable[State]) -> MergedLight:
        """Merge the states of light entities (switches and others are ignored)."""
        lights = [state for state in states if state.domain == "light"]
        on = [state for state in lights if state.state == STATE_ON]
        supported = _supported_modes(lights)
        return cls(
            supported_color_modes=supported,
            color_mode=_color_mode(on, supported),
            hs_color=_mean_tuple(on, ATTR_HS_COLOR),
            rgb_color=_mean_tuple(on, ATTR_RGB_COLOR, integer=True),
            rgbw_color=_mean_tuple(on, ATTR_RGBW_COLOR, integer=True),
            rgbww_color=_mean_tuple(on, ATTR_RGBWW_COLOR, integer=True),
            xy_color=_mean_tuple(on, ATTR_XY_COLOR),
            color_temp_kelvin=_mean_int(on, ATTR_COLOR_TEMP_KELVIN),
            min_color_temp_kelvin=min(
                _values(lights, ATTR_MIN_COLOR_TEMP_KELVIN), default=DEFAULT_MIN_KELVIN
            ),
            max_color_temp_kelvin=max(
                _values(lights, ATTR_MAX_COLOR_TEMP_KELVIN), default=DEFAULT_MAX_KELVIN
            ),
            effect_list=_effect_list(lights),
            effect=_most_common(_values(on, ATTR_EFFECT)),
        )


# ==================================================================================================
# Reducers
# ==================================================================================================


def _values(states: Iterable[State], attribute: str) -> list[Any]:
    return [value for state in states if (value := state.attributes.get(attribute)) is not None]


def _mean_tuple(states: list[State], attribute: str, integer: bool = False) -> Any:
    values = [
        tuple(value) for value in _values(states, attribute) if isinstance(value, (list, tuple))
    ]
    if not values or len({len(value) for value in values}) != 1:
        return None
    means = [sum(column) / len(values) for column in zip(*values, strict=True)]
    return tuple(round(mean) for mean in means) if integer else tuple(means)


def _mean_int(states: list[State], attribute: str) -> int | None:
    values = [value for value in _values(states, attribute) if isinstance(value, (int, float))]
    return round(sum(values) / len(values)) if values else None


def _most_common(values: list[Any]) -> Any:
    return Counter(values).most_common(1)[0][0] if values else None


def _supported_modes(lights: list[State]) -> set[ColorMode]:
    modes: set[ColorMode] = set()
    for value in _values(lights, ATTR_SUPPORTED_COLOR_MODES):
        modes.update(ColorMode(mode) for mode in value if mode in ColorMode._value2member_map_)
    # A group always dims (it computes its brightness): plain on/off becomes brightness.
    modes.discard(ColorMode.ONOFF)
    return filter_supported_color_modes(modes) if modes else {ColorMode.BRIGHTNESS}


def _color_mode(on: list[State], supported: set[ColorMode]) -> ColorMode:
    """The most common mode of the lit members, plain modes last; a supported one."""
    counts = Counter(mode for mode in _values(on, ATTR_COLOR_MODE) if mode in supported)
    for plain in _PLAIN_MODES:
        if plain in counts:
            counts[plain] = 0
    if counts:
        return ColorMode(counts.most_common(1)[0][0])
    # No lit member reports a usable mode (all off, or a group lit only through
    # other members): Home Assistant still needs one, take a supported one.
    return sorted(supported, key=lambda mode: (mode in _PLAIN_MODES, mode.value))[0]


def _effect_list(lights: list[State]) -> list[str] | None:
    lists = [value for value in _values(lights, ATTR_EFFECT_LIST) if isinstance(value, list)]
    if not lists:
        return None
    effects = sorted(set().union(*lists))
    # Like core groups: "None" (no effect) stays first.
    if "None" in effects:
        effects.remove("None")
        effects.insert(0, "None")
    return effects
