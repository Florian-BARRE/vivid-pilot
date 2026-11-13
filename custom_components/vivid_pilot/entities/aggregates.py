# ====== Code Summary ======
# Aggregate entities of the tree:
#   AnyOnBinarySensor   doors / windows / presence: on if any member is on
#   ClimateSensor       mean, min or max of a measure (one entity per stat,
#                       so each keeps its own long-term statistics)
#   PowerSensor         a node's watts, without double counting
#   StripPowerSensor    a WLED strip's watts: estimated current x voltage

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import UnitOfPower

from ..tree import Category
from .base import PilotEntity

BINARY_CLASSES = {
    Category.DOOR: BinarySensorDeviceClass.DOOR,
    Category.WINDOW: BinarySensorDeviceClass.WINDOW,
    Category.PRESENCE: BinarySensorDeviceClass.OCCUPANCY,
}
SENSOR_CLASSES = {
    Category.TEMPERATURE: SensorDeviceClass.TEMPERATURE,
    Category.HUMIDITY: SensorDeviceClass.HUMIDITY,
    Category.PRESSURE: SensorDeviceClass.ATMOSPHERIC_PRESSURE,
    Category.CO2: SensorDeviceClass.CO2,
}
UNAVAILABLE = {"unavailable", "unknown"}


class _MembersMixin(PilotEntity):
    @property
    def _member_ids(self) -> list[str]:
        node = self.spec.node
        return [leaf.entity_id for leaf in self._ctx.members().leaves(node, (node.category,))]


class AnyOnBinarySensor(_MembersMixin, BinarySensorEntity):
    """On when at least one member is on."""

    @property
    def device_class(self) -> BinarySensorDeviceClass | None:
        return BINARY_CLASSES.get(self.spec.node.category)

    def _on(self) -> list[str]:
        return [
            entity_id
            for entity_id in self._member_ids
            if (state := self.hass.states.get(entity_id)) and state.state == "on"
        ]

    @property
    def is_on(self) -> bool:
        return bool(self._on())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        on = self._on()
        return {"count_on": len(on), "members_on": on, "entity_id": self._member_ids}


class ClimateSensor(_MembersMixin, SensorEntity):
    """Mean, min or max of a measure across the node's sensors."""

    _attr_state_class = SensorStateClass.MEASUREMENT

    @property
    def device_class(self) -> SensorDeviceClass | None:
        return SENSOR_CLASSES.get(self.spec.node.category)

    def _values(self) -> list[tuple[float, str, str | None]]:
        values = []
        for entity_id in self._member_ids:
            state = self.hass.states.get(entity_id)
            if state is None or state.state in UNAVAILABLE:
                continue
            try:
                values.append(
                    (float(state.state), entity_id, state.attributes.get("unit_of_measurement"))
                )
            except ValueError:
                continue
        return values

    @property
    def native_unit_of_measurement(self) -> str | None:
        values = self._values()
        return values[0][2] if values else None

    @property
    def native_value(self) -> float | None:
        values = self._values()
        if not values:
            return None
        numbers = [value for value, _, _ in values]
        if self.spec.kind == "min":
            return min(numbers)
        if self.spec.kind == "max":
            return max(numbers)
        return round(sum(numbers) / len(numbers), 2)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        values = self._values()
        if not values or self.spec.kind == "mean":
            return {"entity_id": self._member_ids}
        pick = min if self.spec.kind == "min" else max
        return {"entity_id": self._member_ids, "source": pick(values)[1]}


class PowerSensor(PilotEntity, SensorEntity):
    """Watts of a node, without double counting."""

    _attr_device_class = SensorDeviceClass.POWER
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfPower.WATT

    @property
    def native_value(self) -> float | None:
        return self._ctx.power.total(self.spec.node)


class StripPowerSensor(PilotEntity, SensorEntity):
    """Watts of one WLED strip: estimated current x strip voltage."""

    _attr_device_class = SensorDeviceClass.POWER
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfPower.WATT

    @property
    def name(self) -> str | None:
        state = self.hass.states.get(self.spec.source or "") if self.hass else None
        label = state.name if state else (self.spec.source or "")
        return f"Puissance {label}"

    @property
    def native_value(self) -> float | None:
        source = self._ctx.power.strip_source(self.spec.source or "")
        return self._ctx.power.value(source) if source else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        source = self._ctx.power.strip_source(self.spec.source or "")
        if source is None:
            return {}
        return {
            "light": source.leaf_id,
            "current_sensor": source.entity_id,
            "voltage": source.factor,
        }
