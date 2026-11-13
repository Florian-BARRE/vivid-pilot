# ====== Code Summary ======
# PilotServices: the vivid_pilot.save / restore / forget services, so
# automations and scripts can drive the memories of any node.

from __future__ import annotations

from typing import TYPE_CHECKING

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError

from ..nodes import NodeKey

if TYPE_CHECKING:
    from ..runtime import PilotRuntime

SCHEMA = vol.Schema({vol.Required("node"): str})


class PilotServices:
    """Register the memory services of the integration."""

    def __init__(self, hass: HomeAssistant, runtime: PilotRuntime, domain: str) -> None:
        self._hass = hass
        self._runtime = runtime
        self._domain = domain

    def register(self) -> None:
        for name, handler in (
            ("save", self._save),
            ("restore", self._restore),
            ("forget", self._forget),
        ):
            self._hass.services.async_register(self._domain, name, handler, schema=SCHEMA)

    def unregister(self) -> None:
        for name in ("save", "restore", "forget"):
            self._hass.services.async_remove(self._domain, name)

    @staticmethod
    def _key(call: ServiceCall) -> NodeKey:
        try:
            return NodeKey.parse(call.data["node"])
        except ValueError as error:
            raise ServiceValidationError(str(error)) from error

    async def _save(self, call: ServiceCall) -> None:
        self._runtime.memory.capture(self._key(call))

    async def _restore(self, call: ServiceCall) -> None:
        await self._runtime.memory.async_restore(self._key(call), context=call.context)

    async def _forget(self, call: ServiceCall) -> None:
        self._runtime.memory.forget(self._key(call))
