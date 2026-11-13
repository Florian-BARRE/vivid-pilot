# ====== Code Summary ======
# PayloadBuilder: everything the panel needs in one message — the tree, each
# node's settings, memory summary and generated entity ids, the power sources,
# and the global settings. Live values are not in it:
# the panel reads them from Home Assistant's states (leaves and generated
# entities alike).

from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

if TYPE_CHECKING:
    from ..runtime import PilotRuntime


class PayloadBuilder:
    """Assemble the panel payload from the runtime."""

    def __init__(self, hass: HomeAssistant, runtime: PilotRuntime, domain: str) -> None:
        self._hass = hass
        self._runtime = runtime
        self._domain = domain

    def build(self) -> dict[str, Any]:
        runtime = self._runtime
        tree = runtime.tree.tree
        members = runtime.members()
        registry = er.async_get(self._hass)

        # 1. Generated entity ids, per node and per strip.
        entities: dict[str, dict[str, str]] = defaultdict(dict)
        strips: dict[str, str] = {}
        for spec in runtime.specs:
            entity_id = registry.async_get_entity_id(spec.platform, self._domain, spec.unique_id)
            if entity_id is None:
                continue
            if spec.kind == "strip_power" and spec.source:
                strips[spec.source] = entity_id
            else:
                entities[str(spec.node)][f"{spec.platform}:{spec.kind}"] = entity_id

        # 2. Settings and memory of every memory-capable node.
        nodes = {
            str(key): {
                "settings": members.settings(key).to_dict(),
                "memory": runtime.memory.summary(key),
                "group": runtime.groups.members(key),
            }
            for key in members.memory_nodes()
        }

        # 3. Power sources and global settings.
        sources = [
            {
                "kind": source.kind,
                "area_id": source.area_id,
                "category": source.category.value if source.category else None,
                "entity_id": source.entity_id,
                "leaf_id": source.leaf_id,
                "counted": source.counted,
                "factor": source.factor,
                "value": runtime.power.value(source),
            }
            for source in runtime.power.sources
        ]
        settings = runtime.store.data.settings
        return {
            "version": runtime.version,
            "tree": tree.to_dict(),
            "nodes": nodes,
            "entities": entities,
            "strips": strips,
            "power": sources,
            "power_choices": runtime.power.choices,
            "settings": {
                "memory_master": runtime.memory.master,
                "memory_debounce": runtime.memory.debounce,
                **{
                    k: v
                    for k, v in settings.items()
                    if k not in ("memory_master", "memory_debounce")
                },
            },
        }
