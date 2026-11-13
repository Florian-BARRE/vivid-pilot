# ====== Code Summary ======
# NodeSettings: the per-node settings stored in PilotData.nodes, read with
# defaults. A node's group (what it turns on / off) and its memory (what it
# restores) are two separate member lists, built by NodeMembers.

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from ..tree import Category, HomeTree, TreeLeaf
from .node_key import NodeKey

# Categories a light group drives, and those a memory may cover.
LIGHT_CATEGORIES: tuple[Category, ...] = (Category.LIGHT, Category.LED)
MEMORY_CAPABLE: tuple[Category, ...] = (Category.LIGHT, Category.LED, Category.SWITCH)
DEFAULT_MEMORY_CATEGORIES: tuple[Category, ...] = (Category.LIGHT, Category.LED)


@dataclass(frozen=True, slots=True)
class NodeSettings:
    """Settings of one node, with defaults for missing values."""

    memory_enabled: bool
    memory_categories: tuple[Category, ...]
    memory_excluded: frozenset[str]
    group_excluded: frozenset[str]

    @classmethod
    def from_store(cls, raw: Mapping[str, Any] | None) -> NodeSettings:
        raw = raw or {}
        categories = tuple(
            category
            for category in (Category.parse(value) for value in raw.get("memory_categories", []))
            if category in MEMORY_CAPABLE
        )
        return cls(
            memory_enabled=bool(raw.get("memory_enabled", True)),
            memory_categories=categories
            if "memory_categories" in raw
            else DEFAULT_MEMORY_CATEGORIES,
            memory_excluded=frozenset(raw.get("memory_excluded", [])),
            group_excluded=frozenset(raw.get("group_excluded", [])),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "memory_enabled": self.memory_enabled,
            "memory_categories": [category.value for category in self.memory_categories],
            "memory_excluded": sorted(self.memory_excluded),
            "group_excluded": sorted(self.group_excluded),
        }


class NodeMembers:
    """Resolve the leaves of a node, its group members and its memory members."""

    def __init__(self, tree: HomeTree, nodes: Mapping[str, Mapping[str, Any]]) -> None:
        self._tree = tree
        self._nodes = nodes

    def settings(self, key: NodeKey) -> NodeSettings:
        return NodeSettings.from_store(self._nodes.get(str(key)))

    def leaves(self, key: NodeKey, categories: tuple[Category, ...]) -> list[TreeLeaf]:
        """Leaves under the node whose category is in categories."""
        wanted = set(categories)
        if key.category is not None:
            wanted &= {key.category}
        rooms = (
            self._tree.rooms
            if key.area_id is None
            else [room for room in self._tree.rooms if room.area_id == key.area_id]
        )
        return [
            leaf
            for room in rooms
            for node in room.categories
            if node.category in wanted
            for leaf in node.leaves
        ]

    def group(self, key: NodeKey, categories: tuple[Category, ...]) -> list[str]:
        """Entity ids the node's group drives."""
        excluded = self.settings(key).group_excluded
        return [
            leaf.entity_id
            for leaf in self.leaves(key, categories)
            if leaf.entity_id not in excluded
        ]

    def memory(self, key: NodeKey) -> list[str]:
        """Entity ids the node's memory covers (empty when disabled)."""
        settings = self.settings(key)
        if not settings.memory_enabled:
            return []
        return [
            leaf.entity_id
            for leaf in self.leaves(key, settings.memory_categories)
            if leaf.entity_id not in settings.memory_excluded
        ]

    def memory_nodes(self) -> list[NodeKey]:
        """Every node that can have a memory: home, rooms, their light / led / switch."""
        keys = [NodeKey()]
        for room in self._tree.rooms:
            present = {node.category for node in room.categories}
            if not present & set(MEMORY_CAPABLE):
                continue
            keys.append(NodeKey(area_id=room.area_id))
            keys.extend(
                NodeKey(area_id=room.area_id, category=category)
                for category in MEMORY_CAPABLE
                if category in present
            )
        return keys
