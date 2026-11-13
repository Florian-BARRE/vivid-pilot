# ====== Code Summary ======
# BatterySensor: the lowest battery level of a node (%), with the battery
# holding it and the batteries at or below the low threshold, so a card can
# show "2 batteries faibles" and list them.

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.const import PERCENTAGE

from .aggregates import UNAVAILABLE, MembersMixin


class BatterySensor(MembersMixin, SensorEntity):
    """Lowest battery level of the node's battery sensors."""

    _attr_device_class = SensorDeviceClass.BATTERY
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = PERCENTAGE

    def _levels(self) -> list[tuple[float, str]]:
        """(level, entity id) of every battery that reports a number."""
        levels = []
        for entity_id in self._member_ids:
            state = self.hass.states.get(entity_id)
            if state is None or state.state in UNAVAILABLE:
                continue
            try:
                levels.append((float(state.state), entity_id))
            except ValueError:
                continue
        return levels

    @property
    def native_value(self) -> float | None:
        levels = self._levels()
        return min(levels)[0] if levels else None

    def _attributes(self) -> dict[str, Any]:
        threshold = self._ctx.battery_low()
        levels = self._levels()
        low = [entity_id for level, entity_id in sorted(levels) if level <= threshold]
        return {
            "entity_id": self._member_ids,
            "source": min(levels)[1] if levels else None,
            "low": low,
            "low_count": len(low),
            "low_threshold": threshold,
        }
