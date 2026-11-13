# ====== Code Summary ======
# PilotStore: the single persistence point of the integration. It wraps the
# Home Assistant Store helper (JSON file in .storage/vivid_pilot) and holds:
#   overrides  entity_id -> manual corrections (category, power options...)
#   nodes      node key  -> node settings (memory categories, exclusions...)
#   memories   node key  -> last stored light state of the node
#   settings   global settings (memory master switch, debounce...)

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)

# Writes are grouped: many small edits from the panel make one disk write.
SAVE_DELAY_SECONDS = 2

# ====== Data model ======


@dataclass(slots=True)
class PilotData:
    """Everything Vivid Pilot persists between restarts."""

    overrides: dict[str, dict[str, Any]] = field(default_factory=dict)
    nodes: dict[str, dict[str, Any]] = field(default_factory=dict)
    memories: dict[str, dict[str, Any]] = field(default_factory=dict)
    settings: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> PilotData:
        """Build the data from the stored JSON, ignoring unknown keys."""
        return cls(
            overrides=dict(raw.get("overrides", {})),
            nodes=dict(raw.get("nodes", {})),
            memories=dict(raw.get("memories", {})),
            settings=dict(raw.get("settings", {})),
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialise the data for the Store helper."""
        return asdict(self)


# ====== Store ======


class PilotStore:
    """Load and save PilotData through the Home Assistant Store helper."""

    def __init__(self, hass: HomeAssistant, key: str, version: int) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, version, key)
        self._data = PilotData()

    @property
    def data(self) -> PilotData:
        """Return the in-memory data (load() must have been awaited)."""
        return self._data

    async def load(self) -> PilotData:
        """Read the stored file; start empty when it does not exist yet."""
        _LOGGER.debug("START store load")
        raw = await self._store.async_load()
        self._data = PilotData.from_dict(raw) if raw else PilotData()
        _LOGGER.debug(
            "END store load (overrides=%d, nodes=%d, memories=%d)",
            len(self._data.overrides),
            len(self._data.nodes),
            len(self._data.memories),
        )
        return self._data

    def schedule_save(self) -> None:
        """Write the data to disk a moment later (grouped writes)."""
        self._store.async_delay_save(self._data.to_dict, SAVE_DELAY_SECONDS)

    async def save(self) -> None:
        """Write the current data to disk now."""
        _LOGGER.debug("START store save")
        await self._store.async_save(self._data.to_dict())
        _LOGGER.debug("END store save")
