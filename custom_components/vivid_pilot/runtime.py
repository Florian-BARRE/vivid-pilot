# ====== Code Summary ======
# PilotRuntime: the composition root of the integration. It builds every
# object once (store, panel, websocket API) with its injected settings, starts
# them on setup and stops them on unload. Modules (rooms, memory, automations,
# utilities) will be built and started here too.

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .api import PilotWebsocketApi
from .const import (
    DOMAIN,
    PANEL_BUNDLE_FILE,
    PANEL_ELEMENT_NAME,
    PANEL_FRONTEND_DIR,
    PANEL_ICON,
    PANEL_STATIC_URL,
    PANEL_TITLE,
    PANEL_URL_PATH,
    STORAGE_KEY,
    STORAGE_VERSION,
    WS_TYPE_INFO,
)
from .panel import PanelRegistrar, PanelSettings
from .storage import PilotStore

_LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class PilotRuntime:
    """Every live object of one Vivid Pilot config entry."""

    version: str
    store: PilotStore
    panel: PanelRegistrar
    api: PilotWebsocketApi

    @classmethod
    async def async_create(cls, hass: HomeAssistant) -> PilotRuntime:
        """Build the runtime; the manifest is the single source of the version."""
        integration = await async_get_integration(hass, DOMAIN)
        version = str(integration.version)
        store = PilotStore(hass, STORAGE_KEY, STORAGE_VERSION)
        panel = PanelRegistrar(
            hass,
            PanelSettings(
                url_path=PANEL_URL_PATH,
                element_name=PANEL_ELEMENT_NAME,
                title=PANEL_TITLE,
                icon=PANEL_ICON,
                static_url=PANEL_STATIC_URL,
                bundle_dir=Path(__file__).parent / PANEL_FRONTEND_DIR,
                bundle_file=PANEL_BUNDLE_FILE,
                version=version,
            ),
        )
        api = PilotWebsocketApi(hass, store, version, WS_TYPE_INFO)
        return cls(version=version, store=store, panel=panel, api=api)

    async def async_start(self) -> None:
        """Load the data, then expose the API and the panel."""
        _LOGGER.info("START vivid_pilot runtime (version=%s)", self.version)
        await self.store.load()
        self.api.register()
        await self.panel.register()
        _LOGGER.info("END vivid_pilot runtime start")

    async def async_stop(self) -> None:
        """Remove the panel and flush the data to disk."""
        _LOGGER.info("START vivid_pilot runtime stop")
        self.panel.unregister()
        await self.store.save()
        _LOGGER.info("END vivid_pilot runtime stop")
