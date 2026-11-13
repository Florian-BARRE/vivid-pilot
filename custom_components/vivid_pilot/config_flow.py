# ====== Code Summary ======
# Config flow of Vivid Pilot: a single confirmation step that creates the one
# config entry. Everything else is configured in the sidebar panel, so the
# flow never asks for settings.

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN, INTEGRATION_TITLE


class VividPilotConfigFlow(ConfigFlow, domain=DOMAIN):
    """Create the single Vivid Pilot entry after a confirmation."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Show the confirmation form, then create the entry."""
        # single_config_entry in the manifest already blocks a second entry.
        if user_input is None:
            return self.async_show_form(step_id="user")
        return self.async_create_entry(title=INTEGRATION_TITLE, data={})
