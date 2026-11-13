# ====== Code Summary ======
# Shared pytest fixtures: let Home Assistant load custom_components/ in tests,
# a small home (living room with lamp, WLED strip, metered plug, thermometers,
# light sensor, batteries) and the integration loaded on it.

from __future__ import annotations

import pytest
from homeassistant import config_entries
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.vivid_pilot.const import DOMAIN


@pytest.fixture(autouse=True)
def auto_enable(enable_custom_integrations: None) -> None:
    """Enable custom integrations for every test."""


@pytest.fixture
async def home(hass: HomeAssistant) -> dict[str, str]:
    """A living room: lamp, WLED strip, metered plug, thermometers, light sensor, batteries."""
    salon = ar.async_get(hass).async_create("Salon").id
    source = MockConfigEntry(domain="test")
    source.add_to_hass(hass)
    devices = dr.async_get(hass)
    entities = er.async_get(hass)

    def device(name: str) -> str:
        created = devices.async_get_or_create(
            config_entry_id=source.entry_id, identifiers={("test", name)}, name=name
        )
        devices.async_update_device(created.id, area_id=salon)
        return created.id

    def entity(domain: str, platform: str, uid: str, device_id: str, **kwargs) -> str:
        return entities.async_get_or_create(
            domain, platform, uid, device_id=device_id, config_entry=source, **kwargs
        ).entity_id

    lamp_dev, strip_dev, plug_dev, temp_dev = (device(n) for n in ("lamp", "strip", "plug", "temp"))
    ids = {
        "lamp": entity("light", "hue", "lamp", lamp_dev),
        "strip": entity("light", "wled", "strip", strip_dev),
        "current": entity(
            "sensor", "wled", "current", strip_dev, translation_key="estimated_current"
        ),
        "plug": entity("switch", "zigbee", "plug", plug_dev),
        "plug_power": entity(
            "sensor", "zigbee", "plug_power", plug_dev, original_device_class="power"
        ),
        "t1": entity("sensor", "zigbee", "t1", temp_dev, original_device_class="temperature"),
        "t2": entity("sensor", "esphome", "t2", lamp_dev, original_device_class="temperature"),
        "lux": entity("sensor", "zigbee", "lux", temp_dev, original_device_class="illuminance"),
        # Integrations file battery levels as diagnostic: they must still count.
        "bat1": entity(
            "sensor",
            "zigbee",
            "bat1",
            temp_dev,
            original_device_class="battery",
            entity_category=EntityCategory.DIAGNOSTIC,
        ),
        "bat2": entity("sensor", "zigbee", "bat2", plug_dev, original_device_class="battery"),
    }
    hass.states.async_set(ids["lamp"], "off")
    hass.states.async_set(ids["strip"], "off")
    hass.states.async_set(ids["current"], "2000", {"unit_of_measurement": "mA"})
    hass.states.async_set(ids["plug"], "on")
    hass.states.async_set(ids["plug_power"], "12.5", {"unit_of_measurement": "W"})
    hass.states.async_set(ids["t1"], "20.5", {"unit_of_measurement": "°C"})
    hass.states.async_set(ids["t2"], "21.5", {"unit_of_measurement": "°C"})
    hass.states.async_set(ids["lux"], "320", {"unit_of_measurement": "lx"})
    hass.states.async_set(ids["bat1"], "15", {"unit_of_measurement": "%"})
    hass.states.async_set(ids["bat2"], "80", {"unit_of_measurement": "%"})
    ids["salon"] = salon
    return ids


@pytest.fixture
async def loaded(hass: HomeAssistant, home: dict[str, str]) -> config_entries.ConfigEntry:
    await async_setup_component(hass, "http", {})
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    return result["result"]
