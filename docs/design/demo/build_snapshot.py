# ====== Code Summary ======
# Builds a demo home in Home Assistant's test harness, loads Vivid Pilot on it
# and writes what the panel receives (payload, states, areas) to
# docs/design/demo/snapshot.json; the home itself is described in home.json.
# The panel preview (preview.html) and the README pictures are made from the
# snapshot, so they show the real panel on a home that
# belongs to nobody.
#
# Run: uv run pytest docs/design/demo/build_snapshot.py -p no:cacheprovider -o pythonpath=.

from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest
from homeassistant import config_entries
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.vivid_pilot.const import DOMAIN

# ==================================================================================================
# Constants
# ==================================================================================================

OUTPUT = Path(__file__).with_name("snapshot.json")
# Rooms, devices and entities of the demo home, with their states.
HOME = json.loads(Path(__file__).with_name("home.json").read_text())


# ==================================================================================================
# Fixtures
# ==================================================================================================


@pytest.fixture(autouse=True)
def auto_enable(enable_custom_integrations: None) -> None:
    """Let Home Assistant load custom_components/."""


async def _build_home(hass: HomeAssistant) -> None:
    """Areas, devices and entities of HOME, with their states."""
    areas = ar.async_get(hass)
    devices = dr.async_get(hass)
    entities = er.async_get(hass)
    source = MockConfigEntry(domain="demo")
    source.add_to_hass(hass)
    area_ids = {
        room: areas.async_create(room).id for room in {d["room"] for d in HOME if d["room"]}
    }
    for item in HOME:
        room, device_name = item["room"], item["device"]
        device = devices.async_get_or_create(
            config_entry_id=source.entry_id, identifiers={("demo", device_name)}, name=device_name
        )
        if room:
            devices.async_update_device(device.id, area_id=area_ids[room])
        for member in item["entities"]:
            domain, platform, key = member["domain"], member["platform"], member["key"]
            name, device_class = member["name"], member["device_class"]
            state, attributes = member["state"], member["attributes"]
            extra: dict[str, Any] = {}
            if device_class == "current":
                extra["translation_key"] = "estimated_current"
            elif device_class:
                extra["original_device_class"] = device_class
            if device_class == "battery":
                extra["entity_category"] = EntityCategory.DIAGNOSTIC
            entry = entities.async_get_or_create(
                domain,
                platform,
                key,
                device_id=device.id,
                config_entry=source,
                original_name=name,
                **extra,
            )
            hass.states.async_set(entry.entity_id, state, {"friendly_name": name, **attributes})


# ==================================================================================================
# Snapshot
# ==================================================================================================


async def test_build_snapshot(hass: HomeAssistant, hass_ws_client: Any) -> None:
    """Load Vivid Pilot on the demo home and write what the panel receives."""
    await _build_home(hass)
    await async_setup_component(hass, "http", {})
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    # Two corrections made in the panel: a desk lamp on a smart plug filed as
    # a lamp, and a 12 V strip.
    client = await hass_ws_client(hass)
    for message in (
        {"entity_id": "switch.bureau_lampe_de_bureau", "category": "light"},
        {"entity_id": "light.salon_canape_leds", "options": {"voltage": 12}},
    ):
        await client.send_json_auto_id({"type": "vivid_pilot/leaf/update", **message})
        assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    # Touch what is on, so every memory captures it as it would at home.
    for state in hass.states.async_all("light"):
        if state.state == "on":
            hass.states.async_set(state.entity_id, "off", dict(state.attributes))
            hass.states.async_set(state.entity_id, "on", dict(state.attributes))
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=10))
    await hass.async_block_till_done()
    runtime = result["result"].runtime_data
    states = {
        state.entity_id: {
            "entity_id": state.entity_id,
            "state": state.state,
            "last_changed": state.last_changed.isoformat(),
            "attributes": dict(state.attributes),
        }
        for state in hass.states.async_all()
    }
    areas = {
        area.id: {"area_id": area.id, "name": area.name}
        for area in ar.async_get(hass).async_list_areas()
    }
    snapshot = {
        "payload": runtime.hub.payload(),
        "states": states,
        "areas": areas,
        "language": "fr",
    }
    OUTPUT.write_text(json.dumps(snapshot, ensure_ascii=False, indent=1, default=str))
