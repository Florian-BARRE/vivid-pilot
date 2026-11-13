# ====== Code Summary ======
# CategoryDetector: guesses the category of an entity from the registries
# only (domain, platform, device class, flags) — never from its id or name.
# It also decides which entities are not tree candidates at all (disabled,
# hidden by an integration, configuration / diagnostic entities, groups).

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.helpers import entity_registry as er

from .categories import Category

# ====== Settings ======


@dataclass(frozen=True, slots=True)
class DetectorSettings:
    """Rules the detector applies; injected so tests and users can change them."""

    own_platform: str
    strip_platforms: frozenset[str]
    excluded_platforms: frozenset[str]


@dataclass(frozen=True, slots=True)
class Detection:
    """The detected category and a short, user-readable reason."""

    category: Category
    reason: str


# ====== Device class tables ======

_BINARY_SENSOR_CLASSES: dict[str, Category] = {
    "door": Category.DOOR,
    "garage_door": Category.DOOR,
    "window": Category.WINDOW,
    # Generic contact sensors are most often windows; the panel flags them.
    "opening": Category.WINDOW,
    "motion": Category.PRESENCE,
    "occupancy": Category.PRESENCE,
    "presence": Category.PRESENCE,
}

_SENSOR_CLASSES: dict[str, Category] = {
    "temperature": Category.TEMPERATURE,
    "humidity": Category.HUMIDITY,
    "atmospheric_pressure": Category.PRESSURE,
    "pressure": Category.PRESSURE,
    "carbon_dioxide": Category.CO2,
    "power": Category.POWER,
}

# ====== Detector ======


class CategoryDetector:
    """Map an entity registry entry to a tree category."""

    def __init__(self, settings: DetectorSettings) -> None:
        self._settings = settings

    def is_candidate(self, entry: er.RegistryEntry) -> bool:
        """Tell whether the entity may appear in the tree at all."""
        settings = self._settings
        if entry.platform == settings.own_platform:
            return False
        if entry.platform in settings.excluded_platforms:
            return False
        if entry.disabled_by is not None:
            return False
        # Hidden by an integration = replaced by another entity (switch_as_x).
        if entry.hidden_by is er.RegistryEntryHider.INTEGRATION:
            return False
        # Configuration and diagnostic entities are not things in a room.
        return entry.entity_category is None

    def detect(self, entry: er.RegistryEntry) -> Detection | None:
        """Return the category of a candidate entity, or None if it has none."""
        domain = entry.domain
        device_class = entry.device_class or entry.original_device_class
        if domain == "light":
            if entry.platform in self._settings.strip_platforms:
                return Detection(Category.LED, f"light from the {entry.platform} platform")
            return Detection(Category.LIGHT, "light")
        if domain == "switch":
            return Detection(Category.SWITCH, "switch")
        if domain == "binary_sensor" and device_class in _BINARY_SENSOR_CLASSES:
            return Detection(_BINARY_SENSOR_CLASSES[device_class], f"device class {device_class}")
        if domain == "sensor" and device_class in _SENSOR_CLASSES:
            return Detection(_SENSOR_CLASSES[device_class], f"device class {device_class}")
        return None
