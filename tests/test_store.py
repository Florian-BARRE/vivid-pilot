# ====== Code Summary ======
# Tests of PilotStore: empty start, then a save / load round trip.

from __future__ import annotations

from homeassistant.core import HomeAssistant

from custom_components.vivid_pilot.const import STORAGE_KEY, STORAGE_VERSION
from custom_components.vivid_pilot.storage import PilotStore


async def test_store_round_trip(hass: HomeAssistant, hass_storage) -> None:
    """Data saved by one store is read back by a new one."""
    store = PilotStore(hass, STORAGE_KEY, STORAGE_VERSION)
    data = await store.load()
    assert data.overrides == {} and data.memories == {}

    data.overrides["light.salon_lampe"] = {"role": "lamp"}
    await store.save()

    reloaded = await PilotStore(hass, STORAGE_KEY, STORAGE_VERSION).load()
    assert reloaded.overrides == {"light.salon_lampe": {"role": "lamp"}}
