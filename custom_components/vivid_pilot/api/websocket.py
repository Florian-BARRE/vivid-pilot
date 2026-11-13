# ====== Code Summary ======
# PilotWebsocketApi: the websocket commands the panel calls, all named
# "vivid_pilot/<command>":
#   info, subscribe, rescan
#   leaf/update   category and options (nominal power, voltage, upstream, counted)
#   leaf/area     move an entity (or its whole device) to another room
#   node/update   memory on/off, memory categories, memory / group exclusions
#   memory/save, memory/restore, memory/forget, group/turn_on, group/turn_off
#   settings/update, presence/update
# Every change is written to the store, then the runtime rebuilds what
# depends on it and the panel receives the new payload.

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send

from ..const import SIGNAL_REFRESH
from ..nodes import MEMORY_CAPABLE, NodeKey
from ..tree import Category

if TYPE_CHECKING:
    from ..runtime import PilotRuntime

_LOGGER = logging.getLogger(__name__)

type Handler = Callable[[websocket_api.ActiveConnection, dict[str, Any]], Awaitable[Any]]

OPTION_SCHEMA = vol.Schema(
    {
        vol.Optional("nominal_power"): vol.Any(None, vol.Coerce(float)),
        vol.Optional("voltage"): vol.Any(None, vol.Coerce(float)),
        vol.Optional("upstream"): vol.Any(None, str),
        vol.Optional("counted"): vol.Any(None, bool),
    }
)
NODE = {vol.Required("node"): str}


class PilotWebsocketApi:
    """Register and serve the websocket commands of the integration."""

    def __init__(self, hass: HomeAssistant, runtime: PilotRuntime, prefix: str) -> None:
        self._hass = hass
        self._runtime = runtime
        self._prefix = prefix

    def register(self) -> None:
        """Register every command (safe on each setup: HA overwrites)."""
        commands: list[tuple[str, dict[Any, Any], Handler]] = [
            ("info", {}, self._info),
            ("rescan", {}, self._rescan),
            (
                "leaf/update",
                {
                    vol.Required("entity_id"): str,
                    vol.Optional("category"): vol.Any(None, str),
                    vol.Optional("options"): OPTION_SCHEMA,
                    vol.Optional("reset"): bool,
                },
                self._leaf_update,
            ),
            (
                "leaf/area",
                {
                    vol.Required("entity_id"): str,
                    vol.Required("area_id"): vol.Any(None, str),
                    vol.Optional("scope", default="device"): vol.In(["device", "entity"]),
                },
                self._leaf_area,
            ),
            (
                "node/update",
                {
                    **NODE,
                    vol.Optional("memory_enabled"): bool,
                    vol.Optional("memory_categories"): [str],
                    vol.Optional("memory_excluded"): [str],
                    vol.Optional("group_excluded"): [str],
                },
                self._node_update,
            ),
            ("memory/save", NODE, self._memory_save),
            ("memory/restore", NODE, self._memory_restore),
            ("memory/forget", NODE, self._memory_forget),
            ("group/turn_on", NODE, self._group_on),
            ("group/turn_off", NODE, self._group_off),
            (
                "settings/update",
                {
                    vol.Optional("memory_master"): bool,
                    vol.Optional("memory_debounce"): vol.All(
                        vol.Coerce(float), vol.Range(min=0.5, max=60)
                    ),
                },
                self._settings_update,
            ),
            (
                "presence/update",
                {
                    vol.Required("area_id"): str,
                    vol.Optional("enabled"): bool,
                    vol.Optional("delay"): vol.All(vol.Coerce(int), vol.Range(min=1, max=240)),
                },
                self._presence_update,
            ),
        ]
        for name, schema, handler in commands:
            command_type = f"{self._prefix}/{name}"
            websocket_api.async_register_command(
                self._hass,
                command_type,
                self._wrap(handler),
                websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
                    {vol.Required("type"): command_type, **schema}
                ),
            )
        websocket_api.async_register_command(
            self._hass,
            f"{self._prefix}/subscribe",
            self._subscribe,
            websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
                {vol.Required("type"): f"{self._prefix}/subscribe"}
            ),
        )

    def _wrap(self, handler: Handler) -> Any:
        """Run an async handler; answer its result, or a readable error."""

        @websocket_api.async_response
        async def _run(
            hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
        ) -> None:
            try:
                result = await handler(connection, msg)
            except ValueError as error:
                connection.send_error(msg["id"], "invalid", str(error))
                return
            connection.send_result(msg["id"], result)

        return _run

    # ====== Read ======

    @callback
    def _subscribe(
        self, hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
    ) -> None:
        """Send the payload now and after every change."""
        message_id = msg["id"]

        @callback
        def forward(payload: dict[str, Any]) -> None:
            connection.send_message(websocket_api.event_message(message_id, payload))

        connection.send_result(message_id)
        connection.subscriptions[message_id] = self._runtime.hub.subscribe(forward)

    async def _info(self, connection: Any, msg: dict[str, Any]) -> dict[str, Any]:
        data = self._runtime.store.data
        return {
            "version": self._runtime.version,
            "overrides": len(data.overrides),
            "memories": len(data.memories),
        }

    async def _rescan(self, connection: Any, msg: dict[str, Any]) -> None:
        self._runtime.tree.async_rebuild_now()

    # ====== Leaves ======

    async def _leaf_update(self, connection: Any, msg: dict[str, Any]) -> None:
        entity_id = msg["entity_id"]
        overrides = self._runtime.store.data.overrides
        if msg.get("reset"):
            overrides.pop(entity_id, None)
        else:
            override = overrides.setdefault(entity_id, {})
            if "category" in msg:
                category = msg["category"]
                if category is not None and Category.parse(category) is None:
                    raise ValueError(f"Unknown category: {category}")
                _set(override, "category", category)
            for name, value in msg.get("options", {}).items():
                _set(override, name, value)
            if not override:
                overrides.pop(entity_id, None)
        self._changed(rebuild=True)

    async def _leaf_area(self, connection: Any, msg: dict[str, Any]) -> None:
        entities = er.async_get(self._hass)
        entry = entities.async_get(msg["entity_id"])
        if entry is None:
            raise ValueError("Unknown entity")
        if msg["scope"] == "device" and entry.device_id:
            dr.async_get(self._hass).async_update_device(entry.device_id, area_id=msg["area_id"])
            # The entity follows its device unless it had an area of its own.
            if entry.area_id is not None:
                entities.async_update_entity(entry.entity_id, area_id=None)
        else:
            entities.async_update_entity(entry.entity_id, area_id=msg["area_id"])
        # Registry events trigger the rebuild.

    # ====== Nodes ======

    async def _node_update(self, connection: Any, msg: dict[str, Any]) -> None:
        key = NodeKey.parse(msg["node"])
        node = self._runtime.store.data.nodes.setdefault(str(key), {})
        if "memory_enabled" in msg:
            node["memory_enabled"] = msg["memory_enabled"]
        if "memory_categories" in msg:
            allowed = {category.value for category in MEMORY_CAPABLE}
            node["memory_categories"] = [c for c in msg["memory_categories"] if c in allowed]
        for name in ("memory_excluded", "group_excluded"):
            if name in msg:
                node[name] = sorted(set(msg[name]))
        self._changed(rebuild=False)

    async def _memory_save(self, connection: Any, msg: dict[str, Any]) -> bool:
        return self._runtime.memory.capture(NodeKey.parse(msg["node"]))

    async def _memory_restore(self, connection: Any, msg: dict[str, Any]) -> bool:
        return await self._runtime.memory.async_restore(
            NodeKey.parse(msg["node"]), context=connection.context(msg)
        )

    async def _memory_forget(self, connection: Any, msg: dict[str, Any]) -> None:
        self._runtime.memory.forget(NodeKey.parse(msg["node"]))

    async def _group_on(self, connection: Any, msg: dict[str, Any]) -> None:
        await self._runtime.groups.async_turn_on(
            NodeKey.parse(msg["node"]), context=connection.context(msg)
        )

    async def _group_off(self, connection: Any, msg: dict[str, Any]) -> None:
        await self._runtime.groups.async_turn_off(
            NodeKey.parse(msg["node"]), context=connection.context(msg)
        )

    # ====== Settings ======

    async def _settings_update(self, connection: Any, msg: dict[str, Any]) -> None:
        settings = self._runtime.store.data.settings
        for name in ("memory_master", "memory_debounce"):
            if name in msg:
                settings[name] = msg[name]
        self._changed(rebuild=False)

    async def _presence_update(self, connection: Any, msg: dict[str, Any]) -> None:
        self._runtime.presence.update(
            msg["area_id"], enabled=msg.get("enabled"), delay=msg.get("delay")
        )
        # The auto-lighting switches show the new setting.
        async_dispatcher_send(self._hass, SIGNAL_REFRESH)

    @callback
    def _changed(self, rebuild: bool) -> None:
        """Persist, then rebuild the tree or just re-apply the settings."""
        self._runtime.store.schedule_save()
        if rebuild:
            self._runtime.tree.async_rebuild_now()
        else:
            self._runtime.apply()


def _set(target: dict[str, Any], name: str, value: Any) -> None:
    """Set a value, or remove the key when value is None."""
    if value is None:
        target.pop(name, None)
    else:
        target[name] = value
