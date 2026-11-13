# ====== Code Summary ======
# EntitySync: keeps each platform's generated entities equal to the specs of
# the current tree — adds the new ones, updates the kept ones, removes the
# ones whose node disappeared (from the entity registry too). Platforms
# register their add callback here when they are set up.

from __future__ import annotations

import logging
from collections.abc import Callable

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .base import PilotContext, PilotEntity
from .catalog import EntitySpec

_LOGGER = logging.getLogger(__name__)

type EntityFactory = Callable[[PilotContext, EntitySpec], PilotEntity]


class EntitySync:
    """Match the live entities of every platform with the wanted specs."""

    def __init__(
        self,
        hass: HomeAssistant,
        context: PilotContext,
        factories: dict[tuple[str, str], EntityFactory],
    ) -> None:
        self._hass = hass
        self._context = context
        self._factories = factories
        self._adders: dict[str, AddEntitiesCallback] = {}
        self._entities: dict[str, PilotEntity] = {}
        self._specs: list[EntitySpec] = []

    @callback
    def register_platform(self, platform: str, add_entities: AddEntitiesCallback) -> None:
        """A platform is ready: create its entities, drop leftovers of older versions."""
        self._adders[platform] = add_entities
        self._apply(platform)
        self._prune(platform)

    @callback
    def _prune(self, platform: str) -> None:
        """Remove registry entries of ours that no spec produces any more."""
        wanted = {spec.unique_id for spec in self._specs if spec.platform == platform}
        registry = er.async_get(self._hass)
        stale = [
            entry.entity_id
            for entry in list(registry.entities.values())
            if entry.platform == self._context.domain
            and entry.domain == platform
            and entry.unique_id not in wanted
        ]
        for entity_id in stale:
            registry.async_remove(entity_id)
        if stale:
            _LOGGER.info("END entity prune (platform=%s, removed=%d)", platform, len(stale))

    @callback
    def update(self, specs: list[EntitySpec]) -> None:
        """New specs (tree rebuilt): sync every registered platform."""
        self._specs = specs
        for platform in list(self._adders):
            self._apply(platform)

    @callback
    def _apply(self, platform: str) -> None:
        wanted = {spec.unique_id: spec for spec in self._specs if spec.platform == platform}
        current = {uid: e for uid, e in self._entities.items() if e.spec.platform == platform}
        # 1. Remove entities whose node is gone.
        registry = er.async_get(self._hass)
        for unique_id in set(current) - set(wanted):
            entity = self._entities.pop(unique_id)
            if entity_id := registry.async_get_entity_id(platform, self._context.domain, unique_id):
                registry.async_remove(entity_id)
            elif entity.hass is not None:
                self._hass.async_create_task(entity.async_remove())
        # 2. Update the kept ones (members may have changed).
        for unique_id in set(current) & set(wanted):
            self._entities[unique_id].update_spec(wanted[unique_id])
        # 3. Create the new ones.
        new: list[PilotEntity] = []
        for unique_id in set(wanted) - set(current):
            spec = wanted[unique_id]
            factory = self._factories.get((spec.platform, spec.kind))
            if factory is None:
                continue
            entity = factory(self._context, spec)
            self._entities[unique_id] = entity
            new.append(entity)
        if new:
            self._adders[platform](new)
        _LOGGER.debug(
            "END entity sync (platform=%s, total=%d, added=%d)", platform, len(wanted), len(new)
        )
