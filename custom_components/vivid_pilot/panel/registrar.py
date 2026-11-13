# ====== Code Summary ======
# PanelRegistrar: serves the built Lit bundle and adds the Vivid Pilot panel
# to the Home Assistant sidebar (admin only). Static paths cannot be removed
# from aiohttp, so they are registered once per Home Assistant run.

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

# ====== Settings ======


@dataclass(frozen=True, slots=True)
class PanelSettings:
    """Where the bundle lives and how the panel appears in the sidebar."""

    url_path: str
    element_name: str
    title: str
    icon: str
    static_url: str
    bundle_dir: Path
    bundle_file: str
    version: str


# ====== Registrar ======


class PanelRegistrar:
    """Register and remove the sidebar panel of the integration."""

    _static_registered_key = "vivid_pilot_static_registered"

    def __init__(self, hass: HomeAssistant, settings: PanelSettings) -> None:
        self._hass = hass
        self._settings = settings

    async def register(self) -> None:
        """Serve the bundle and add the panel to the sidebar."""
        settings = self._settings
        _LOGGER.debug("START panel register (url_path=%s)", settings.url_path)

        # 1. Serve the bundle folder, once per Home Assistant run.
        if not self._hass.data.get(self._static_registered_key):
            await self._hass.http.async_register_static_paths(
                [StaticPathConfig(settings.static_url, str(settings.bundle_dir), False)]
            )
            self._hass.data[self._static_registered_key] = True

        # 2. Add the panel; the version query string busts the browser cache.
        module_url = f"{settings.static_url}/{settings.bundle_file}?v={settings.version}"
        await panel_custom.async_register_panel(
            self._hass,
            frontend_url_path=settings.url_path,
            webcomponent_name=settings.element_name,
            sidebar_title=settings.title,
            sidebar_icon=settings.icon,
            module_url=module_url,
            require_admin=True,
            config={},
        )
        _LOGGER.debug("END panel register (module_url=%s)", module_url)

    def unregister(self) -> None:
        """Remove the panel from the sidebar (the static path stays served)."""
        _LOGGER.debug("START panel unregister (url_path=%s)", self._settings.url_path)
        frontend.async_remove_panel(self._hass, self._settings.url_path)
        _LOGGER.debug("END panel unregister")
