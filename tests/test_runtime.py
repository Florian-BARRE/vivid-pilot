# ====== Code Summary ======
# End-to-end tests of the full integration on a small home: generated
# entities (groups, climate, power with WLED and nominal power, scenes),
# memory capture and restore, corrections through the websocket API.

from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.vivid_pilot.nodes import NodeKey

from .helpers import tick as _tick


async def test_generated_entities(hass: HomeAssistant, home, loaded) -> None:
    """Groups, climate, power and scenes appear with the expected values."""
    # Lights and LEDs stay distinct: no combined room group.
    assert hass.states.get("light.vivid_pilot_salon") is None
    assert hass.states.get("light.vivid_pilot_all_light") is not None
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
    assert hass.states.get("scene.vivid_pilot_salon_state") is not None, sorted(
        s for s in hass.states.async_entity_ids() if "vivid" in s
    )
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
        and payload["entities"]["salon__light"]["light:group"] == "light.vivid_pilot_salon_light"
    )


async def test_power_source_choice(hass: HomeAssistant, home, loaded, hass_ws_client) -> None:
    """A strip with its own meter uses it; choosing "wled" switches to the estimate."""
    entities = er.async_get(hass)
    strip_device = entities.async_get(home["strip"]).device_id
    meter = entities.async_get_or_create(
        "sensor", "template", "strip_meter", device_id=strip_device, original_device_class="power"
    ).entity_id
    hass.states.async_set(meter, "3", {"unit_of_measurement": "W"})
    await hass.async_block_till_done()
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=2))
    await hass.async_block_till_done()
    # Measured by the meter: 12.5 (plug) + 3 (strip meter).
    assert hass.states.get("sensor.vivid_pilot_salon_power").state == "15.5"
    assert loaded.runtime_data.power.choices[home["strip"]]["effective"] == "measured"

    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": "vivid_pilot/leaf/update",
            "entity_id": home["strip"],
            "options": {"power_source": "wled", "voltage": 12},
        }
    )
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    # 2000 mA x 12 V = 24 W replaces the 3 W meter.
    assert hass.states.get("sensor.vivid_pilot_salon_power").state == "36.5"
    assert loaded.runtime_data.power.choices[home["strip"]]["effective"] == "wled"


async def test_memory_skips_unavailable_and_reports(
    hass: HomeAssistant, home, loaded, hass_ws_client
) -> None:
    """An unavailable member never blocks a capture; saving with all off says why."""
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "vivid_pilot/memory/save", "node": "salon"})
    assert (await client.receive_json())["result"] == {"saved": False, "reason": "nothing_on"}

    hass.states.async_set(home["strip"], "unavailable")
    hass.states.async_set(home["lamp"], "on", {"brightness": 200})
    await hass.async_block_till_done()
    await _tick(hass)
    stored = loaded.runtime_data.store.data.memories["salon"]["states"]
    assert home["lamp"] in stored and home["strip"] not in stored
