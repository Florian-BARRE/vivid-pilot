# ====== Code Summary ======
# PowerModel: where each watt of the tree comes from, without double counting.
# Three kinds of source:
#   measured  a power sensor (category "power"), attributed to the light /
#             LED / switch of the same device when there is one
#   wled      a WLED strip without measured power: estimated current x voltage
#   nominal   a light / switch with no measure at all: power set by hand,
#             counted while it is on (scaled by brightness for lights)
# Each light / LED / switch can choose its source (power_source option:
# auto, measured, wled, nominal, none); auto prefers measured > wled >
# nominal. Choosing anything but the meter takes the device's meters out of
# totals. A source with an upstream meter, or unchecked "counted", stays out.

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from ..nodes import NodeKey
from ..tree import Category, HomeTree, TreeLeaf

ATTRIBUTABLE: tuple[Category, ...] = (Category.LIGHT, Category.LED, Category.SWITCH)
UNAVAILABLE = {"unavailable", "unknown"}


@dataclass(frozen=True, slots=True)
class PowerSettings:
    """Platform facts the model relies on; injected from const.py."""

    strip_platforms: frozenset[str]
    current_translation_keys: frozenset[str]
    default_voltage: float


@dataclass(frozen=True, slots=True)
class PowerSource:
    """One source of watts in one room."""

    kind: str  # measured | wled | nominal
    area_id: str
    category: Category | None  # attributed category, None = other
    entity_id: str  # the entity read (power sensor, current sensor or the light)
    leaf_id: str  # the tree leaf it belongs to
    counted: bool
    factor: float = 1.0  # voltage for wled, nominal watts for nominal


class PowerModel:
    """Build the power sources of a tree and compute node totals."""

    def __init__(self, hass: HomeAssistant, settings: PowerSettings) -> None:
        self._hass = hass
        self._settings = settings
        self._sources: list[PowerSource] = []
        # leaf id -> {"available": [...], "chosen": ..., "effective": ...}
        self._choices: dict[str, dict[str, object]] = {}

    @property
    def sources(self) -> list[PowerSource]:
        return list(self._sources)

    def rebuild(self, tree: HomeTree) -> None:
        """Recompute the sources from a new tree."""
        sources: list[PowerSource] = []
        self._choices = {}
        for room in tree.rooms:
            leaves = [leaf for node in room.categories for leaf in node.leaves]
            sources.extend(self._room_sources(room.area_id, leaves))
        self._sources = sources

    @property
    def choices(self) -> dict[str, dict[str, object]]:
        """Power source choices of every light / LED / switch leaf."""
        return dict(self._choices)

    def inputs(self) -> set[str]:
        """Entities whose state changes the totals."""
        return {source.entity_id for source in self._sources}

    def value(self, source: PowerSource) -> float | None:
        """Current watts of a source, None when unknown."""
        state = self._hass.states.get(source.entity_id)
        if state is None or state.state in UNAVAILABLE:
            return None
        if source.kind == "nominal":
            if state.state != "on":
                return 0.0
            brightness = state.attributes.get("brightness")
            ratio = brightness / 255 if isinstance(brightness, (int, float)) else 1.0
            return round(source.factor * ratio, 2)
        try:
            raw = float(state.state)
        except ValueError:
            return None
        if source.kind == "wled":
            return round(raw / 1000 * source.factor, 2)
        unit = state.attributes.get("unit_of_measurement")
        return raw * 1000 if unit == "kW" else raw

    def total(self, key: NodeKey) -> float | None:
        """Sum of the counted sources under a node; None without any source."""
        matching = [source for source in self._sources if self._matches(source, key)]
        if not matching:
            return None
        values = [self.value(source) for source in matching if source.counted]
        return round(sum(value for value in values if value is not None), 2)

    def has_sources(self, key: NodeKey) -> bool:
        return any(self._matches(source, key) for source in self._sources)

    def strip_source(self, leaf_id: str) -> PowerSource | None:
        """The computed WLED source of a strip leaf, if any."""
        return next((s for s in self._sources if s.kind == "wled" and s.leaf_id == leaf_id), None)

    # ====== Helpers ======

    @staticmethod
    def _matches(source: PowerSource, key: NodeKey) -> bool:
        if key.area_id is not None and source.area_id != key.area_id:
            return False
        return key.category is None or source.category == key.category

    def _room_sources(self, area_id: str, leaves: list[TreeLeaf]) -> list[PowerSource]:
        by_device: dict[str | None, list[TreeLeaf]] = defaultdict(list)
        for leaf in leaves:
            by_device[leaf.device_id].append(leaf)
        sources: list[PowerSource] = []
        for device_id, device_leaves in by_device.items():
            sources.extend(self._device_sources(area_id, device_id, device_leaves))
        return sources

    def _device_sources(
        self, area_id: str, device_id: str | None, leaves: list[TreeLeaf]
    ) -> list[PowerSource]:
        meters = [leaf for leaf in leaves if leaf.category is Category.POWER]
        consumers = [leaf for leaf in leaves if leaf.category in ATTRIBUTABLE]
        # Without a device, a meter cannot be tied to a consumer.
        tied = device_id is not None and bool(consumers)
        owner = consumers[0].category if tied else None
        counted_meter = tied and any(_counted(meter) for meter in meters)

        # 1. Each consumer's source: its choice, else measured > WLED > nominal.
        sources: list[PowerSource] = []
        replaced = False
        for leaf in consumers:
            current = self._current_sensor(leaf, device_id)
            nominal = _as_float(leaf.option("nominal_power"), 0.0)
            available = [
                k
                for k, ok in (
                    ("measured", tied and bool(meters)),
                    ("wled", current is not None),
                    ("nominal", True),
                    ("none", True),
                )
                if ok
            ]
            chosen = leaf.option("power_source") or "auto"
            if chosen not in available:
                chosen = "auto"
            effective = chosen
            if chosen == "auto":
                effective = (
                    "measured"
                    if counted_meter
                    else "wled"
                    if current
                    else "nominal"
                    if nominal > 0
                    else "none"
                )
            else:
                # An explicit choice other than the meter takes the meter out of totals.
                replaced = replaced or chosen != "measured"
            self._choices[leaf.entity_id] = {
                "available": available,
                "chosen": chosen,
                "effective": effective,
            }
            if effective == "wled" and current is not None:
                voltage = _as_float(leaf.option("voltage"), self._settings.default_voltage)
                sources.append(
                    PowerSource(
                        "wled",
                        area_id,
                        leaf.category,
                        current,
                        leaf.entity_id,
                        _counted(leaf),
                        voltage,
                    )
                )
            elif effective == "nominal" and nominal > 0:
                sources.append(
                    PowerSource(
                        "nominal",
                        area_id,
                        leaf.category,
                        leaf.entity_id,
                        leaf.entity_id,
                        _counted(leaf),
                        nominal,
                    )
                )

        # 2. The device's meters, counted unless a consumer chose another source.
        meter_sources = [
            PowerSource(
                "measured",
                area_id,
                owner,
                meter.entity_id,
                meter.entity_id,
                _counted(meter) and not replaced,
            )
            for meter in meters
        ]
        return meter_sources + sources

    def _current_sensor(self, leaf: TreeLeaf, device_id: str | None) -> str | None:
        """The estimated-current sensor of a strip's device, if any."""
        if device_id is None or leaf.platform not in self._settings.strip_platforms:
            return None
        for entry in er.async_entries_for_device(er.async_get(self._hass), device_id):
            if (
                entry.domain == "sensor"
                and entry.translation_key in self._settings.current_translation_keys
            ):
                return entry.entity_id
        return None


def _counted(leaf: TreeLeaf) -> bool:
    return leaf.option("counted", True) is not False and not leaf.option("upstream")


def _as_float(value: object, default: float) -> float:
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default
