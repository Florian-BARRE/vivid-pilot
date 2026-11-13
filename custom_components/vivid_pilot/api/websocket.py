# ====== Code Summary ======
# PilotWebsocketApi: the websocket commands the panel calls.
#   vivid_pilot/info            -> version and storage counters
#   vivid_pilot/tree/get        -> the current tree
#   vivid_pilot/tree/subscribe  -> the tree now, then every rebuilt tree

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from ..storage import PilotStore
from ..tree import HomeTree, PilotTree

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class WebsocketCommands:
    """Command type names, injected from const.py."""

    info: str
    tree_get: str
    tree_subscribe: str


class PilotWebsocketApi:
    """Register the websocket commands of the integration."""

    def __init__(
        self,
        hass: HomeAssistant,
        store: PilotStore,
        tree: PilotTree,
        version: str,
        commands: WebsocketCommands,
    ) -> None:
        self._hass = hass
        self._store = store
        self._tree = tree
        self._version = version
        self._commands = commands

    def register(self) -> None:
        """Register every command (safe to call on each setup: HA overwrites)."""
        commands = self._commands
        _LOGGER.debug("START websocket register")
        for command_type, handler in (
            (commands.info, self._handle_info),
            (commands.tree_get, self._handle_tree_get),
            (commands.tree_subscribe, self._handle_tree_subscribe),
        ):
            websocket_api.async_register_command(
                self._hass, command_type, handler, self._schema(command_type)
            )
        _LOGGER.debug("END websocket register")

    @staticmethod
    def _schema(command_type: str) -> vol.Schema:
        return websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {vol.Required("type"): command_type}
        )

    # ====== Handlers ======

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

    @callback
    def _handle_tree_get(
        self,
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Answer with the current tree."""
        connection.send_result(msg["id"], self._tree.tree.to_dict())

    @callback
    def _handle_tree_subscribe(
        self,
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Send the tree now, then every rebuilt tree, until unsubscribed."""
        message_id = msg["id"]

        @callback
        def forward(tree: HomeTree) -> None:
            connection.send_message(websocket_api.event_message(message_id, tree.to_dict()))

        connection.subscriptions[message_id] = self._tree.async_subscribe(forward)
        connection.send_result(message_id)
        forward(self._tree.tree)
