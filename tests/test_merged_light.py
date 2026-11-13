# ====== Code Summary ======
# Tests of MergedLight and of the light groups that use it: a group offers the
# colors, color temperatures and effects of its members.

from __future__ import annotations

from homeassistant.components.light import ColorMode
from homeassistant.core import HomeAssistant, State

from custom_components.vivid_pilot.entities.merged_light import MergedLight

from .helpers import tick

WLED_ON = {
    "supported_color_modes": ["rgb"],
    "color_mode": "rgb",
    "rgb_color": [255, 0, 0],
    "hs_color": [0.0, 100.0],
    "brightness": 128,
    "effect_list": ["Solid", "Rainbow"],
    "effect": "Solid",
}


def test_dimmable_only_members_keep_brightness() -> None:
    merged = MergedLight.of([State("light.a", "on", {"supported_color_modes": ["brightness"]})])
    assert merged.supported_color_modes == {ColorMode.BRIGHTNESS}
    assert merged.effect_list is None


def test_colors_and_effects_are_merged() -> None:
    merged = MergedLight.of(
        [
            State("light.a", "on", WLED_ON),
            State(
                "light.b",
                "on",
                {**WLED_ON, "rgb_color": [0, 0, 255], "effect_list": ["Solid", "Fire"]},
            ),
            State(
                "light.c",
                "off",
                {"supported_color_modes": ["color_temp"], "min_color_temp_kelvin": 2700},
            ),
            State("switch.d", "on", {}),
        ]
    )
    assert merged.supported_color_modes == {ColorMode.RGB, ColorMode.COLOR_TEMP}
    assert merged.color_mode == ColorMode.RGB
    assert merged.rgb_color == (128, 0, 128)
    assert merged.min_color_temp_kelvin == 2700
    assert merged.effect_list == ["Fire", "Rainbow", "Solid"]
    assert merged.effect == "Solid"


def test_onoff_members_count_as_brightness() -> None:
    merged = MergedLight.of(
        [State("light.a", "on", {"supported_color_modes": ["onoff"], "color_mode": "onoff"})]
    )
    assert merged.supported_color_modes == {ColorMode.BRIGHTNESS}
    assert merged.color_mode == ColorMode.BRIGHTNESS


def test_a_color_mode_is_always_reported() -> None:
    assert MergedLight.of([State("light.a", "off", WLED_ON)]).color_mode == ColorMode.RGB
    assert MergedLight.of([]).color_mode == ColorMode.BRIGHTNESS


async def test_led_group_offers_the_strip_colors(hass: HomeAssistant, home, loaded) -> None:
    """The LED group of a room reports the strip's color modes, color and effects."""
    hass.states.async_set(home["strip"], "on", WLED_ON)
    await tick(hass)
    state = hass.states.get("light.vivid_pilot_salon_led")
    assert state.state == "on"
    assert state.attributes["supported_color_modes"] == [ColorMode.RGB]
    assert state.attributes["color_mode"] == ColorMode.RGB
    assert state.attributes["rgb_color"] == (255, 0, 0)
    assert state.attributes["effect_list"] == ["Rainbow", "Solid"]
    assert state.attributes["effect"] == "Solid"
