# ====== Code Summary ======
# PilotWebsocketApi: the websocket commands the panel calls. For now a single
# "vivid_pilot/info" command proves the panel <-> integration link; room
# listing and override commands will be added here as the modules arrive.

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from ..storage import PilotStore

_LOGGER = logging.getLogger(__name__)


class PilotWebsocketApi:
    """Register the websocket commands of the integration."""

    def __init__(
        self, hass: HomeAssistant, store: PilotStore, version: str, info_type: str
    ) -> None:
        self._hass = hass
        self._store = store
        self._version = version
        self._info_type = info_type

    def register(self) -> None:
        """Register every command (safe to call on each setup: HA overwrites)."""
        _LOGGER.debug("START websocket register")
        websocket_api.async_register_command(
            self._hass,
            self._info_type,
            self._handle_info,
            websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
                {vol.Required("type"): self._info_type}
            ),
        )
        _LOGGER.debug("END websocket register (commands=%s)", [self._info_type])

    @callback
    def _handle_info(
        self,
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Answer with the integration version and storage counters."""
        data = self._store.data
        connection.send_result(
            msg["id"],
            {
                "version": self._version,
                "overrides": len(data.overrides),
                "memories": len(data.memories),
            },
        )
