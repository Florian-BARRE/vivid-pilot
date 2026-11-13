# ====== Code Summary ======
# EnergySensor: a node's energy (kWh), the integral of its power sensor's
# value over time. Power is a step function (it holds until a member
# changes), so each step adds "previous watts x elapsed time". The total is
# restored across restarts and keeps growing (total_increasing), ready for
# the Energy dashboard and the bill cards.

from __future__ import annotations

from datetime import datetime, timedelta

from homeassistant.components.sensor import (
    RestoreSensor,
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.const import UnitOfEnergy
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .base import PilotEntity

SECONDS_PER_HOUR = 3600.0
WATTS_PER_KILOWATT = 1000.0


class EnergySensor(PilotEntity, RestoreSensor):
    """kWh of a node: its power integrated over time."""

    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_suggested_display_precision = 3

    _total: float = 0.0
    _watts: float | None = None
    _since: datetime | None = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        # 1. Restore the running total.
        last = await self.async_get_last_sensor_data()
        if last is not None and isinstance(last.native_value, int | float):
            self._total = float(last.native_value)
        # 2. Start a step from the current power.
        self._watts = self._ctx.power.total(self.spec.node)
        self._since = dt_util.utcnow()
        # 3. Close a step regularly even when nothing changes.
        self.async_on_remove(
            async_track_time_interval(
                self.hass,
                self._on_interval,
                timedelta(seconds=self._ctx.energy_interval),
            )
        )

    @property
    def native_value(self) -> float:
        return round(self._total, 4)

    @callback
    def _accumulate(self) -> None:
        """Add the step that just ended, then start a new one at the current power."""
        now = dt_util.utcnow()
        if self._watts is not None and self._since is not None:
            hours = (now - self._since).total_seconds() / SECONDS_PER_HOUR
            self._total += max(self._watts, 0.0) * hours / WATTS_PER_KILOWATT
        self._watts = self._ctx.power.total(self.spec.node)
        self._since = now

    @callback
    def _refresh(self) -> None:
        self._accumulate()
        self.async_write_ha_state()

    @callback
    def _on_interval(self, _now: datetime) -> None:
        self._refresh()
