# ====== Code Summary ======
# MemorySceneEntity: the memory of a node as a scene. Activating it restores
# the node's last stored state. Unavailable while the node's memory is
# disabled or the global memory switch is off.

from __future__ import annotations

from typing import Any

from homeassistant.components.scene import Scene

from .base import PilotEntity


class MemorySceneEntity(PilotEntity, Scene):
    """Restore a node's last state."""

    @property
    def available(self) -> bool:
        return self._ctx.memory.is_active(self.spec.node)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        summary = self._ctx.memory.summary(self.spec.node)
        return {
            "entity_id": summary["members"],
            "saved_at": summary["saved_at"],
            "stored_entities": summary["count"],
            "vivid_pilot_node": str(self.spec.node),
        }

    async def async_activate(self, **kwargs: Any) -> None:
        await self._ctx.memory.async_restore(self.spec.node, context=self._context)
