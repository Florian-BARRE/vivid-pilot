# ====== Code Summary ======
# Entry point of the Vivid Pilot integration. It stays thin: it builds the
# PilotRuntime (composition root) for the config entry, starts it, and stops
# it on unload. No business logic lives here.

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .runtime import PilotRuntime

type PilotConfigEntry = ConfigEntry[PilotRuntime]


async def async_setup_entry(hass: HomeAssistant, entry: PilotConfigEntry) -> bool:
    """Build and start the runtime of the config entry."""
    runtime = await PilotRuntime.async_create(hass)
    await runtime.async_start()
    entry.runtime_data = runtime
    return True


async def async_unload_entry(hass: HomeAssistant, entry: PilotConfigEntry) -> bool:
    """Stop the runtime of the config entry."""
    await entry.runtime_data.async_stop()
    return True
