# ====== Code Summary ======
# The tree data model: Home (all) -> RoomNode (one per HA area) ->
# CategoryNode -> TreeLeaf (a real HA entity). Plain immutable data, with a
# to_dict() used by the websocket API. Building it is TreeBuilder's job.

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .categories import Category, LeafSource


@dataclass(frozen=True, slots=True)
class TreeLeaf:
    """A real Home Assistant entity placed in the tree."""

    entity_id: str
    name: str
    category: Category
    source: LeafSource
    reason: str
    device_id: str | None
    platform: str = ""
    # Manual options besides the category (power: nominal, voltage, upstream...).
    options: tuple[tuple[str, Any], ...] = ()

    @property
    def domain(self) -> str:
        return self.entity_id.split(".", 1)[0]

    def option(self, name: str, default: Any = None) -> Any:
        """Return one manual option, or default."""
        return dict(self.options).get(name, default)

    def to_dict(self) -> dict[str, Any]:
        """Serialise for the panel."""
        return {
            "entity_id": self.entity_id,
            "name": self.name,
            "category": self.category.value,
            "source": self.source.value,
            "reason": self.reason,
            "device_id": self.device_id,
            "platform": self.platform,
            "options": dict(self.options),
        }


@dataclass(frozen=True, slots=True)
class CategoryNode:
    """All the leaves of one category in one room."""

    category: Category
    leaves: tuple[TreeLeaf, ...]

    def to_dict(self) -> dict[str, Any]:
        """Serialise for the panel."""
        return {
            "category": self.category.value,
            "leaves": [leaf.to_dict() for leaf in self.leaves],
        }


@dataclass(frozen=True, slots=True)
class RoomNode:
    """One HA area and its non-empty categories, in display order."""

    area_id: str
    name: str
    icon: str | None
    floor_id: str | None
    categories: tuple[CategoryNode, ...]

    def to_dict(self) -> dict[str, Any]:
        """Serialise for the panel."""
        return {
            "area_id": self.area_id,
            "name": self.name,
            "icon": self.icon,
            "floor_id": self.floor_id,
            "categories": [node.to_dict() for node in self.categories],
        }


@dataclass(frozen=True, slots=True)
class HomeTree:
    """The whole tree: rooms with at least one leaf, plus leaves without area."""

    rooms: tuple[RoomNode, ...] = ()
    unassigned: tuple[TreeLeaf, ...] = ()
    ignored: tuple[TreeLeaf, ...] = field(default=())

    def to_dict(self) -> dict[str, Any]:
        """Serialise for the panel."""
        return {
            "rooms": [room.to_dict() for room in self.rooms],
            "unassigned": [leaf.to_dict() for leaf in self.unassigned],
            "ignored": [leaf.to_dict() for leaf in self.ignored],
        }
