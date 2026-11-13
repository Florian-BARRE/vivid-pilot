# ====== Code Summary ======
# Entry point of the Vivid Pilot integration. It stays thin: it builds the
# PilotRuntime (composition root) for the config entry, starts it, sets up
# the entity platforms, and stops everything on unload.

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .entities import PLATFORMS
from .runtime import PilotRuntime

type PilotConfigEntry = ConfigEntry[PilotRuntime]


async def async_setup_entry(hass: HomeAssistant, entry: PilotConfigEntry) -> bool:
    """Build and start the runtime, then the platforms of generated entities."""
    runtime = await PilotRuntime.async_create(hass)
    entry.runtime_data = runtime
    await runtime.async_start()
    await hass.config_entries.async_forward_entry_setups(entry, list(PLATFORMS))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: PilotConfigEntry) -> bool:
    """Unload the platforms, then stop the runtime."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, list(PLATFORMS))
    if unloaded:
        await entry.runtime_data.async_stop()
    return unloaded
