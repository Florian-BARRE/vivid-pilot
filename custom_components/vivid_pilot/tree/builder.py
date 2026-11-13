# ====== Code Summary ======
# TreeBuilder: builds a HomeTree from the entity, device and area registries
# plus the stored manual overrides. A leaf's room is its entity's area, else
# its device's area; its category is the override, else the detection.

from __future__ import annotations

import logging
from collections import defaultdict
from collections.abc import Mapping
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .categories import CATEGORY_ORDER, Category, LeafSource
from .detector import CategoryDetector, Detection
from .model import CategoryNode, HomeTree, RoomNode, TreeLeaf

_LOGGER = logging.getLogger(__name__)


class TreeBuilder:
    """Turn the registries and the overrides into a HomeTree."""

    def __init__(self, hass: HomeAssistant, detector: CategoryDetector) -> None:
        self._hass = hass
        self._detector = detector

    def build(self, overrides: Mapping[str, Mapping[str, Any]]) -> HomeTree:
        """Build the tree from the current registries."""
        _LOGGER.debug("START tree build (overrides=%d)", len(overrides))
        entities = er.async_get(self._hass)
        devices = dr.async_get(self._hass)
        areas = ar.async_get(self._hass)

        # 1. Place every candidate entity: area id (or None) -> leaves.
        by_area: dict[str | None, list[TreeLeaf]] = defaultdict(list)
        ignored: list[TreeLeaf] = []
        for entry in entities.entities.values():
            if not self._detector.is_candidate(entry):
                continue
            device = devices.async_get(entry.device_id) if entry.device_id else None
            leaf = self._leaf(entry, device, overrides.get(entry.entity_id, {}))
            if leaf is None:
                continue
            if leaf.category is Category.IGNORED:
                ignored.append(leaf)
                continue
            area_id = entry.area_id or (device.area_id if device else None)
            by_area[area_id].append(leaf)

        # 2. Group each known area's leaves by category, in display order.
        rooms = [
            self._room(area, by_area[area.id])
            for area in sorted(areas.async_list_areas(), key=lambda item: item.name.casefold())
            if by_area.get(area.id)
        ]
        # Leaves whose area no longer exists are treated as unassigned.
        known = {area.id for area in areas.async_list_areas()}
        unassigned = [
            leaf for area_id, leaves in by_area.items() if area_id not in known for leaf in leaves
        ]
        tree = HomeTree(
            rooms=tuple(rooms),
            unassigned=tuple(sorted(unassigned, key=self._sort_key)),
            ignored=tuple(sorted(ignored, key=self._sort_key)),
        )
        _LOGGER.debug(
            "END tree build (rooms=%d, unassigned=%d, ignored=%d)",
            len(tree.rooms),
            len(tree.unassigned),
            len(tree.ignored),
        )
        return tree

    # ====== Helpers ======

    def _leaf(
        self,
        entry: er.RegistryEntry,
        device: dr.DeviceEntry | None,
        override: Mapping[str, Any],
    ) -> TreeLeaf | None:
        """Build a leaf, or None when the entity has no category."""
        manual = Category.parse(override.get("category")) if override else None
        if manual is not None:
            detection: Detection | None = Detection(manual, "set by hand")
            source = LeafSource.MANUAL
        else:
            detection = self._detector.detect(entry)
            source = LeafSource.AUTO
        if detection is None:
            return None
        return TreeLeaf(
            entity_id=entry.entity_id,
            name=self._name(entry, device),
            category=detection.category,
            source=source,
            reason=detection.reason,
            device_id=entry.device_id,
        )

    def _name(self, entry: er.RegistryEntry, device: dr.DeviceEntry | None) -> str:
        """Prefer the live friendly name, then the registry names."""
        state = self._hass.states.get(entry.entity_id)
        if state is not None and state.name:
            return state.name
        device_name = (device.name_by_user or device.name) if device else None
        own = entry.name or entry.original_name
        if entry.has_entity_name and device_name:
            return f"{device_name} {own}" if own else device_name
        return own or device_name or entry.entity_id

    def _room(self, area: ar.AreaEntry, leaves: list[TreeLeaf]) -> RoomNode:
        """Group a room's leaves by category, keeping the display order."""
        by_category: dict[Category, list[TreeLeaf]] = defaultdict(list)
        for leaf in leaves:
            by_category[leaf.category].append(leaf)
        categories = tuple(
            CategoryNode(category, tuple(sorted(by_category[category], key=self._sort_key)))
            for category in CATEGORY_ORDER
            if by_category.get(category)
        )
        return RoomNode(
            area_id=area.id,
            name=area.name,
            icon=area.icon,
            floor_id=area.floor_id,
            categories=categories,
        )

    @staticmethod
    def _sort_key(leaf: TreeLeaf) -> tuple[str, str]:
        # The entity id breaks ties between leaves with the same name.
        return (leaf.name.casefold(), leaf.entity_id)
