# ====== Code Summary ======
# The scene platform of Vivid Pilot: hands its add callback to the entity
# sync, which creates the generated scene entities of the tree.

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import PilotConfigEntry


async def async_setup_entry(
    hass: HomeAssistant, entry: PilotConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Register the platform; entities follow the tree from now on."""
    entry.runtime_data.entities.register_platform("scene", async_add_entities)
