# ====== Code Summary ======
# Tests of the tree: detection by registries, placement by area (entity area
# wins over device area), exclusions, manual overrides and live rebuilds.

from __future__ import annotations

from datetime import timedelta

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

from custom_components.vivid_pilot.tree import (
    Category,
    CategoryDetector,
    DetectorSettings,
    HomeTree,
    LeafSource,
    PilotTree,
    TreeBuilder,
)

SETTINGS = DetectorSettings(
    own_platform="vivid_pilot",
    strip_platforms=frozenset({"wled"}),
    excluded_platforms=frozenset({"group"}),
)


def _categories(tree: HomeTree, room: str) -> dict[str, list[str]]:
    """Return {category: [entity ids]} for one room name."""
    node = next(item for item in tree.rooms if item.name == room)
    return {cat.category.value: [leaf.entity_id for leaf in cat.leaves] for cat in node.categories}


@pytest.fixture
def home(hass: HomeAssistant) -> dict[str, str]:
    """A living room device with typical entities, plus noise to ignore."""
    areas = ar.async_get(hass)
    salon = areas.async_create("Salon").id
    chambre = areas.async_create("Chambre").id
    entry = MockConfigEntry(domain="test")
    entry.add_to_hass(hass)
    devices = dr.async_get(hass)
    device = devices.async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={("test", "salon-hub")}, name="Salon hub"
    )
    devices.async_update_device(device.id, area_id=salon)
    entities = er.async_get(hass)

    def add(domain: str, platform: str, uid: str, **kwargs) -> str:
        return entities.async_get_or_create(
            domain, platform, uid, device_id=device.id, config_entry=entry, **kwargs
        ).entity_id

    ids = {
        "lamp": add("light", "hue", "lamp"),
        "strip": add("light", "wled", "strip"),
        "plug": add("switch", "zigbee", "plug"),
        "window": add("binary_sensor", "zigbee", "window", original_device_class="window"),
        "contact": add("binary_sensor", "zigbee", "contact", original_device_class="opening"),
        "temp": add("sensor", "esphome", "temp", original_device_class="temperature"),
        "power": add("sensor", "zigbee", "power", original_device_class="power"),
        "diag": add(
            "sensor",
            "esphome",
            "rssi",
            original_device_class="signal_strength",
            entity_category=er.EntityCategory.DIAGNOSTIC,
        ),
        "config_switch": add("switch", "wled", "sync", entity_category=er.EntityCategory.CONFIG),
        "disabled": add("light", "hue", "old", disabled_by=er.RegistryEntryDisabler.USER),
        "group": add("light", "group", "all_lights"),
        "hidden": add("switch", "zigbee", "wrapped", hidden_by=er.RegistryEntryHider.INTEGRATION),
        "lonely": entities.async_get_or_create("light", "hue", "no_area").entity_id,
    }
    # An entity's own area wins over its device's.
    # (Recent HA versions only allow it for entities with a name of their own.)
    ids["bedside"] = add("light", "hue", "bedside", original_name="Chevet", has_entity_name=True)
    entities.async_update_entity(ids["bedside"], area_id=chambre)
    ids["salon"] = salon
    ids["device"] = device.id
    return ids


async def test_detection_and_placement(hass: HomeAssistant, home: dict[str, str]) -> None:
    """Roles come from the registries, rooms from areas, noise is left out."""
    tree = TreeBuilder(hass, CategoryDetector(SETTINGS)).build({})

    assert [room.name for room in tree.rooms] == ["Chambre", "Salon"]
    assert _categories(tree, "Salon") == {
        "light": [home["lamp"]],
        "led": [home["strip"]],
        "switch": [home["plug"]],
        "window": sorted([home["window"], home["contact"]]),
        "temperature": [home["temp"]],
        "power": [home["power"]],
    }
    assert _categories(tree, "Chambre") == {"light": [home["bedside"]]}
    assert [leaf.entity_id for leaf in tree.unassigned] == [home["lonely"]]


async def test_overrides(hass: HomeAssistant, home: dict[str, str]) -> None:
    """A manual category wins; 'ignored' takes the leaf out of the rooms."""
    overrides = {home["plug"]: {"category": "light"}, home["temp"]: {"category": "ignored"}}
    tree = TreeBuilder(hass, CategoryDetector(SETTINGS)).build(overrides)

    salon = _categories(tree, "Salon")
    assert sorted(salon["light"]) == sorted([home["lamp"], home["plug"]])
    assert "switch" not in salon and "temperature" not in salon
    plug = next(
        leaf
        for room in tree.rooms
        for cat in room.categories
        for leaf in cat.leaves
        if leaf.entity_id == home["plug"]
    )
    assert plug.source is LeafSource.MANUAL and plug.category is Category.LIGHT
    assert [leaf.entity_id for leaf in tree.ignored] == [home["temp"]]


async def test_live_rebuild(hass: HomeAssistant, home: dict[str, str]) -> None:
    """Moving the device to another area rebuilds the tree and notifies."""
    engine = PilotTree(hass, TreeBuilder(hass, CategoryDetector(SETTINGS)), lambda: {}, 1.0)
    engine.async_start()
    received: list[HomeTree] = []
    engine.async_subscribe(received.append)

    bureau = ar.async_get(hass).async_create("Bureau").id
    dr.async_get(hass).async_update_device(home["device"], area_id=bureau)
    await hass.async_block_till_done()
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=2))
    await hass.async_block_till_done()

    assert received, "subscriber was not notified"
    assert "Salon" not in [room.name for room in engine.tree.rooms]
    assert "lamp" not in str(_categories(engine.tree, "Chambre"))
    assert home["lamp"] in _categories(engine.tree, "Bureau")["light"]
    engine.async_stop()
