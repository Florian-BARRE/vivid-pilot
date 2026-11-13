# ====== Code Summary ======
# NodeKey: the identity of a node of the tree — "all", a room ("<area_id>")
# or a category of a room ("<area_id>__<category>"). Used as the key of
# node settings and memories in the store, and inside generated unique ids.

from __future__ import annotations

from dataclasses import dataclass

from ..tree import Category

ALL_KEY = "all"
SEPARATOR = "__"


@dataclass(frozen=True, slots=True)
class NodeKey:
    """A node of the tree: the home, a room, or a category of either.

    "all" is the home, "all__led" every LED of the home, "salon" a room and
    "salon__led" the LEDs of that room. Area ids never contain "__".
    """

    area_id: str | None = None
    category: Category | None = None

    @property
    def is_home(self) -> bool:
        return self.area_id is None and self.category is None

    @property
    def is_room(self) -> bool:
        return self.area_id is not None and self.category is None

    def __str__(self) -> str:
        base = self.area_id or ALL_KEY
        if self.category is None:
            return base
        return f"{base}{SEPARATOR}{self.category.value}"

    @classmethod
    def parse(cls, raw: str) -> NodeKey:
        """Read a key written by __str__; raise ValueError on a bad key."""
        area_id, _, category = raw.partition(SEPARATOR)
        if not area_id:
            raise ValueError(f"Invalid node key: {raw!r}")
        area = None if area_id == ALL_KEY else area_id
        if not category:
            return cls(area_id=area)
        parsed = Category.parse(category)
        if parsed is None:
            raise ValueError(f"Invalid node category: {raw!r}")
        return cls(area_id=area, category=parsed)

    def unique_id(self, kind: str) -> str:
        """Stable unique id of a generated entity of this node."""
        return f"{self}{SEPARATOR}{kind}"

    def object_id(self, kind: str | None = None) -> str:
        """Suggested object id: vivid_pilot_<area>[_<category>][_<kind>]."""
        parts = ["vivid_pilot", self.area_id or ALL_KEY]
        if self.category is not None:
            parts.append(self.category.value)
        if kind:
            parts.append(kind)
        return "_".join(parts)
