# ====== Code Summary ======
# Public facade of the entities package: the catalog, the sync, the shared
# context and the factory table (platform, kind) -> entity class.

from .aggregates import (
    AnyOnBinarySensor,
    ClimateSensor,
    PowerSensor,
    StripPowerSensor,
)
from .base import PilotContext, PilotEntity
from .catalog import DeviceSpec, EntityCatalog, EntitySpec
from .groups import LightGroupEntity, SwitchGroupEntity
from .memory_scene import MemorySceneEntity
from .sync import EntityFactory, EntitySync

FACTORIES: dict[tuple[str, str], EntityFactory] = {
    ("light", "group"): LightGroupEntity,
    ("switch", "group"): SwitchGroupEntity,
    ("scene", "state"): MemorySceneEntity,
    ("binary_sensor", "any"): AnyOnBinarySensor,
    ("sensor", "mean"): ClimateSensor,
    ("sensor", "min"): ClimateSensor,
    ("sensor", "max"): ClimateSensor,
    ("sensor", "power"): PowerSensor,
    ("sensor", "strip_power"): StripPowerSensor,
}
PLATFORMS: tuple[str, ...] = ("light", "switch", "scene", "binary_sensor", "sensor")

__all__ = [
    "FACTORIES",
    "PLATFORMS",
    "DeviceSpec",
    "EntityCatalog",
    "EntitySpec",
    "EntitySync",
    "PilotContext",
    "PilotEntity",
]
