# ====== Code Summary ======
# Tests of the 0.5.0 aggregates and the card contract: illuminance, lowest
# battery (diagnostic batteries included), energy integrated from power, and
# the vivid_pilot_node / vivid_pilot_kind attributes cards rely on.

from __future__ import annotations

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant.core import HomeAssistant

from .helpers import tick


async def test_illuminance_and_battery(hass: HomeAssistant, home, loaded) -> None:
    """Illuminance gets mean / min / max; the lowest battery lists the low ones."""
    assert hass.states.get("sensor.vivid_pilot_salon_illuminance").state == "320.0"
    battery = hass.states.get("sensor.vivid_pilot_salon_battery")
    assert battery.state == "15.0"
    assert battery.attributes["source"] == home["bat1"]
    assert battery.attributes["low"] == [home["bat1"]]
    assert battery.attributes["low_count"] == 1
    assert hass.states.get("sensor.vivid_pilot_all_battery").state == "15.0"


async def test_energy_integrates_power(
    hass: HomeAssistant, home, loaded, freezer: FrozenDateTimeFactory
) -> None:
    """22.5 W held for one hour adds 0.0225 kWh."""
    energy = "sensor.vivid_pilot_salon_energy"
    assert float(hass.states.get(energy).state) == 0
    for _ in range(60):
        freezer.tick(60)
        await tick(hass, 0)
    assert float(hass.states.get(energy).state) == pytest.approx(0.0225, rel=0.02)
    assert hass.states.get(energy).attributes["state_class"] == "total_increasing"
    assert hass.states.get("sensor.vivid_pilot_all_energy") is not None


async def test_card_contract(hass: HomeAssistant, home, loaded) -> None:
    """Every generated entity names its node and kind."""
    expected = {
        "light.vivid_pilot_salon_light": ("salon__light", "group"),
        "scene.vivid_pilot_salon_state": ("salon", "state"),
        "sensor.vivid_pilot_salon_temperature_min": ("salon__temperature", "min"),
        "sensor.vivid_pilot_salon_power": ("salon", "power"),
        "sensor.vivid_pilot_all_battery": ("all__battery", "battery"),
    }
    for entity_id, (node, kind) in expected.items():
        attributes = hass.states.get(entity_id).attributes
        assert (attributes["vivid_pilot_node"], attributes["vivid_pilot_kind"]) == (node, kind)
