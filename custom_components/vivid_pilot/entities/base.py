# ====== Code Summary ======
# PilotContext: what generated entities need from the runtime (members,
# groups, memory, power, settings, refresh signal).
# PilotEntity: base of every generated entity — device info of its room (or
# home), translated name, suggested entity id, live refresh on the signal, and
# the card contract: every state carries `vivid_pilot_node` (all, salon,
# salon__light…) and `vivid_pilot_kind` (group, state, mean, power…), so
# cards find generated entities without ever reading names.

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity

from ..control import GroupController
from ..memory import MemoryEngine
from ..nodes import NodeMembers
from ..power import PowerModel
from .catalog import EntitySpec


@dataclass(frozen=True, slots=True)
class PilotContext:
    """Shared services handed to every generated entity."""

    hass: HomeAssistant
    domain: str
    signal: str
    members: Callable[[], NodeMembers]
    groups: GroupController
    memory: MemoryEngine
    power: PowerModel
    battery_low: Callable[[], float]
    energy_interval: float


class PilotEntity(Entity):
    """Base of the generated entities."""

    _attr_should_poll = False
    _attr_has_entity_name = True

    def __init__(self, context: PilotContext, spec: EntitySpec) -> None:
        self._ctx = context
        self._spec = spec
        self._attr_unique_id = spec.unique_id
        self._attr_translation_key = spec.translation_key
        self._attr_translation_placeholders = dict(spec.placeholders)
        self.entity_id = f"{spec.platform}.{spec.object_id}"
        self._attr_device_info = DeviceInfo(
            identifiers={(context.domain, spec.device.identifier)},
            name=spec.device.name,
            manufacturer="Vivid Pilot",
            model="Maison" if spec.device.area_id is None else "Pièce",
            # Matched by name to the existing area of the room.
            suggested_area=spec.device.name if spec.device.area_id else None,
        )

    @property
    def spec(self) -> EntitySpec:
        return self._spec

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """The card contract, then the entity's own attributes."""
        return {
            "vivid_pilot_node": str(self._spec.node),
            "vivid_pilot_kind": self._spec.kind,
            **self._attributes(),
        }

    def _attributes(self) -> dict[str, Any]:
        """Attributes of the entity itself; subclasses add theirs here."""
        return {}

    @callback
    def update_spec(self, spec: EntitySpec) -> None:
        """The tree changed: take the new spec and refresh."""
        self._spec = spec
        if self.hass is not None:
            self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, self._ctx.signal, self._refresh))

    @callback
    def _refresh(self) -> None:
        self.async_write_ha_state()
