# ====== Code Summary ======
# End-to-end tests of the full integration on a small home: generated
# entities (groups, climate, power with WLED and nominal power, scenes),
# memory capture and restore, corrections through the websocket API.

from __future__ import annotations

from datetime import timedelta

import pytest
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.vivid_pilot.const import DOMAIN
from custom_components.vivid_pilot.nodes import NodeKey


async def _tick(hass: HomeAssistant, seconds: float = 3) -> None:
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=seconds))
    await hass.async_block_till_done()


@pytest.fixture
async def home(hass: HomeAssistant) -> dict[str, str]:
    """A living room: a lamp, a WLED strip, a metered plug, two thermometers."""
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
    }
    hass.states.async_set(ids["lamp"], "off")
    hass.states.async_set(ids["strip"], "off")
    hass.states.async_set(ids["current"], "2000", {"unit_of_measurement": "mA"})
    hass.states.async_set(ids["plug"], "on")
    hass.states.async_set(ids["plug_power"], "12.5", {"unit_of_measurement": "W"})
    hass.states.async_set(ids["t1"], "20.5", {"unit_of_measurement": "°C"})
    hass.states.async_set(ids["t2"], "21.5", {"unit_of_measurement": "°C"})
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


async def test_generated_entities(hass: HomeAssistant, home, loaded) -> None:
    """Groups, climate, power and scenes appear with the expected values."""
    assert hass.states.get("light.vivid_pilot_salon") is not None
    assert hass.states.get("light.vivid_pilot_salon_light").attributes["entity_id"] == [
        home["lamp"]
    ]
    assert hass.states.get("light.vivid_pilot_salon_led").attributes["entity_id"] == [home["strip"]]
    assert hass.states.get("switch.vivid_pilot_salon_switch").state == "on"
    assert hass.states.get("sensor.vivid_pilot_salon_temperature").state == "21.0"
    assert hass.states.get("sensor.vivid_pilot_salon_temperature_min").state == "20.5"
    assert hass.states.get("sensor.vivid_pilot_salon_temperature_max").state == "21.5"
    # Strip: 2000 mA x 5 V = 10 W; plug measured 12.5 W.
    strip_power = f"sensor.vivid_pilot_{home['strip'].split('.')[1]}_power"
    assert hass.states.get(strip_power).state == "10.0"
    assert hass.states.get("sensor.vivid_pilot_salon_power").state == "22.5"
    assert hass.states.get("sensor.vivid_pilot_salon_led_power").state == "10.0"
    assert hass.states.get("scene.vivid_pilot_salon_state") is not None
    assert hass.states.get("scene.vivid_pilot_all_state") is not None


async def test_memory_capture_and_restore(hass: HomeAssistant, home, loaded) -> None:
    """A light change is memorised after the debounce and restored by the group."""
    runtime = loaded.runtime_data
    hass.states.async_set(home["lamp"], "on", {"brightness": 128, "color_mode": "brightness"})
    await hass.async_block_till_done()
    await _tick(hass)
    stored = runtime.store.data.memories["salon"]["states"]
    assert stored[home["lamp"]] == {
        "state": "on",
        "attributes": {"brightness": 128, "color_mode": "brightness"},
    }
    # Everything off: the memory keeps the last useful state.
    hass.states.async_set(home["lamp"], "off")
    await hass.async_block_till_done()
    await _tick(hass)
    assert runtime.store.data.memories["salon"]["states"][home["lamp"]]["state"] == "on"

    # Restoring through the room group replays the stored state.
    turn_on = async_mock_service(hass, "light", "turn_on")
    await runtime.groups.async_turn_on(NodeKey(area_id="salon"))
    await hass.async_block_till_done()
    calls = [call.data for call in turn_on]
    assert any(home["lamp"] in _ids(data) and data.get("brightness") == 128 for data in calls), (
        calls
    )


def _ids(data: dict) -> list[str]:
    value = data.get("entity_id", [])
    return [value] if isinstance(value, str) else list(value)


async def test_corrections(hass: HomeAssistant, home, loaded, hass_ws_client) -> None:
    """Reclassify the plug as a light and give the lamp a nominal power."""
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "vivid_pilot/leaf/update", "entity_id": home["plug"], "category": "light"}
    )
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    members = hass.states.get("light.vivid_pilot_salon_light").attributes["entity_id"]
    assert sorted(members) == sorted([home["lamp"], home["plug"]])
    assert hass.states.get("switch.vivid_pilot_salon_switch") is None

    await client.send_json_auto_id({"type": "vivid_pilot/subscribe"})
    assert (await client.receive_json())["success"]
    payload = (await client.receive_json())["event"]
    leaves = [
        leaf
        for room in payload["tree"]["rooms"]
        for node in room["categories"]
        for leaf in node["leaves"]
    ]
    plug = next(leaf for leaf in leaves if leaf["entity_id"] == home["plug"])
    assert plug["source"] == "manual" and plug["category"] == "light"
    assert (
        "salon" in payload["nodes"]
        and payload["entities"]["salon"]["light:group"] == "light.vivid_pilot_salon"
    )
