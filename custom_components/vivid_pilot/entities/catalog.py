# ====== Code Summary ======
# EntityCatalog: decides which entities Vivid Pilot generates for a tree.
# Each EntitySpec names its platform, node, kind, translation key, the device
# it belongs to (the room's virtual device, placed in the room's area, or the
# home device) and a stable unique id. The platforms then create, update or
# remove entities so that they match the specs.

from __future__ import annotations

from dataclasses import dataclass, field

from ..nodes import NodeKey, NodeMembers
from ..power import PowerModel
from ..tree import Category, HomeTree

MEASURES: tuple[Category, ...] = (
    Category.TEMPERATURE,
    Category.HUMIDITY,
    Category.PRESSURE,
    Category.CO2,
    Category.ILLUMINANCE,
)
OPENINGS: dict[Category, str] = {
    Category.DOOR: "doors",
    Category.WINDOW: "windows",
    Category.PRESENCE: "presence",
}
GROUPS: dict[Category, tuple[str, str]] = {
    Category.LIGHT: ("light", "light_group"),
    Category.LED: ("light", "led_group"),
    Category.SWITCH: ("switch", "switch_group"),
}


@dataclass(frozen=True, slots=True)
class DeviceSpec:
    """The virtual device an entity belongs to."""

    identifier: str  # area id, or "all" for the home
    name: str
    area_id: str | None


@dataclass(frozen=True, slots=True)
class EntitySpec:
    """One entity to generate."""

    platform: str
    kind: str
    node: NodeKey
    unique_id: str
    object_id: str
    translation_key: str | None
    device: DeviceSpec
    placeholders: tuple[tuple[str, str], ...] = ()
    source: str | None = field(default=None)  # strip light for strip power sensors


class EntityCatalog:
    """Turn a tree into the list of entities to generate."""

    def __init__(self, home_name: str) -> None:
        self._home_name = home_name

    def build(
        self,
        tree: HomeTree,
        members: NodeMembers,
        power: PowerModel,
    ) -> list[EntitySpec]:
        home = DeviceSpec("all", self._home_name, None)
        specs: list[EntitySpec] = []
        home_categories: set[Category] = set()

        for room in tree.rooms:
            device = DeviceSpec(room.area_id, room.name, room.area_id)
            room_key = NodeKey(area_id=room.area_id)
            present = {node.category for node in room.categories}
            home_categories |= present
            # Groups, one per category: lights and LEDs stay distinct.
            for category, (platform, translation) in GROUPS.items():
                if category in present:
                    key = NodeKey(area_id=room.area_id, category=category)
                    specs.append(self._spec(platform, "group", key, translation, device))
            # Openings and presence.
            for category, translation in OPENINGS.items():
                if category in present:
                    key = NodeKey(area_id=room.area_id, category=category)
                    specs.append(self._spec("binary_sensor", "any", key, translation, device))
            # Climate: mean, min and max of each measure.
            for category in MEASURES:
                if category in present:
                    key = NodeKey(area_id=room.area_id, category=category)
                    specs.extend(self._climate(key, category, device))
            # Batteries: the lowest level.
            if Category.BATTERY in present:
                key = NodeKey(area_id=room.area_id, category=Category.BATTERY)
                specs.append(self._spec("sensor", "battery", key, "battery", device))
            # Power and energy: room, categories, WLED strips.
            specs.extend(self._power(room_key, power, device))

        # Memories (scenes) of every memory-capable node.
        for key in members.memory_nodes():
            device = home if key.area_id is None else self._room_device(tree, key.area_id)
            translation = (
                "home_state"
                if key.is_home
                else ("room_state" if key.category is None else f"{key.category.value}_state")
            )
            specs.append(self._spec("scene", "state", key, translation, device, "state"))

        # Home level.
        home_key = NodeKey()
        for category, (platform, translation) in GROUPS.items():
            if category in home_categories:
                key = NodeKey(category=category)
                specs.append(self._spec(platform, "group", key, translation, home))
        for category, translation in OPENINGS.items():
            if category in home_categories:
                specs.append(
                    self._spec(
                        "binary_sensor", "any", NodeKey(category=category), translation, home
                    )
                )
        for category in MEASURES:
            if category in home_categories:
                specs.extend(self._climate(NodeKey(category=category), category, home))
        if Category.BATTERY in home_categories:
            key = NodeKey(category=Category.BATTERY)
            specs.append(self._spec("sensor", "battery", key, "battery", home))
        if power.has_sources(home_key):
            specs.extend(self._metered(home_key, "", home))
        return specs

    # ====== Helpers ======

    @staticmethod
    def _spec(
        platform: str,
        kind: str,
        key: NodeKey,
        translation_key: str,
        device: DeviceSpec,
        object_kind: str | None = None,
    ) -> EntitySpec:
        return EntitySpec(
            platform=platform,
            kind=kind,
            node=key,
            unique_id=key.unique_id(kind),
            object_id=key.object_id(object_kind),
            translation_key=translation_key,
            device=device,
        )

    def _climate(self, key: NodeKey, category: Category, device: DeviceSpec) -> list[EntitySpec]:
        return [
            self._spec(
                "sensor",
                stat,
                key,
                f"{category.value}_{stat}",
                device,
                None if stat == "mean" else stat,
            )
            for stat in ("mean", "min", "max")
        ]

    def _power(self, room_key: NodeKey, power: PowerModel, device: DeviceSpec) -> list[EntitySpec]:
        specs: list[EntitySpec] = []
        if power.has_sources(room_key):
            specs.extend(self._metered(room_key, "", device))
        for category in GROUPS:
            key = NodeKey(area_id=room_key.area_id, category=category)
            if power.has_sources(key):
                specs.extend(self._metered(key, f"{category.value}_", device))
        for source in power.sources:
            if source.kind == "wled" and source.area_id == room_key.area_id:
                leaf_object = source.leaf_id.split(".", 1)[1]
                specs.append(
                    EntitySpec(
                        platform="sensor",
                        kind="strip_power",
                        node=room_key,
                        unique_id=f"strip__{source.leaf_id}__power",
                        object_id=f"vivid_pilot_{leaf_object}_power",
                        translation_key=None,  # named after the strip
                        device=device,
                        source=source.leaf_id,
                    )
                )
        return specs

    def _metered(self, key: NodeKey, prefix: str, device: DeviceSpec) -> list[EntitySpec]:
        """A node's power sensor and the energy sensor integrating it."""
        return [
            self._spec("sensor", kind, key, f"{prefix}{kind}", device, kind)
            for kind in ("power", "energy")
        ]

    @staticmethod
    def _room_device(tree: HomeTree, area_id: str) -> DeviceSpec:
        room = next(item for item in tree.rooms if item.area_id == area_id)
        return DeviceSpec(room.area_id, room.name, room.area_id)
