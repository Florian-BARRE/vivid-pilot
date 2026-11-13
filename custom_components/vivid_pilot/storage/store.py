# ====== Code Summary ======
# PilotStore: the single persistence point of the integration. It wraps the
# Home Assistant Store helper (JSON file in .storage/vivid_pilot) and exposes
# typed load / save operations. Overrides, settings and room memories will be
# added to PilotData as the modules arrive.

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)

# ====== Data model ======


@dataclass(slots=True)
class PilotData:
    """Everything Vivid Pilot persists between restarts."""

    # Manual corrections keyed by entity id (role, room, exclusion...).
    overrides: dict[str, dict[str, Any]] = field(default_factory=dict)
    # Last known light state per room, keyed by area id.
    memories: dict[str, dict[str, Any]] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> PilotData:
        """Build the data from the stored JSON, ignoring unknown keys."""
        return cls(
            overrides=dict(raw.get("overrides", {})),
            memories=dict(raw.get("memories", {})),
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
            "END store load (overrides=%d, memories=%d)",
            len(self._data.overrides),
            len(self._data.memories),
        )
        return self._data

    async def save(self) -> None:
        """Write the current data to disk."""
        _LOGGER.debug("START store save")
        await self._store.async_save(self._data.to_dict())
        _LOGGER.debug("END store save")
