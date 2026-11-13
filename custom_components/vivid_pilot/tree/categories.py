# ====== Code Summary ======
# The closed set of categories a tree leaf can belong to, and how a manual
# override value maps back to one. Categories are the third level of the tree
# (all -> room -> category -> entities).

from __future__ import annotations

from enum import StrEnum


class Category(StrEnum):
    """What a leaf entity is, from the user's point of view."""

    LIGHT = "light"  # lamps and bulbs (plus outlets reclassified as light)
    LED = "led"  # LED strips
    SWITCH = "switch"  # switches and outlets that are not lights
    DOOR = "door"
    WINDOW = "window"
    PRESENCE = "presence"
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    PRESSURE = "pressure"
    CO2 = "co2"
    ILLUMINANCE = "illuminance"
    BATTERY = "battery"  # battery levels (diagnostic entities included)
    POWER = "power"  # power meters, used by the power aggregates
    IGNORED = "ignored"  # manual only: left out of the tree

    @classmethod
    def parse(cls, value: object) -> Category | None:
        """Return the category named by a stored override, or None if unknown."""
        try:
            return cls(str(value))
        except ValueError:
            return None


# Display order of the categories inside a room.
CATEGORY_ORDER: tuple[Category, ...] = (
    Category.LIGHT,
    Category.LED,
    Category.SWITCH,
    Category.DOOR,
    Category.WINDOW,
    Category.PRESENCE,
    Category.TEMPERATURE,
    Category.HUMIDITY,
    Category.PRESSURE,
    Category.CO2,
    Category.ILLUMINANCE,
    Category.BATTERY,
    Category.POWER,
)


class LeafSource(StrEnum):
    """Where a leaf's category comes from."""

    AUTO = "auto"
    MANUAL = "manual"
