// ====== Code Summary ======
// PanelModel: one object the panel's views share — the payload from the
// integration, the live Home Assistant object, the API client and the
// aggregator — with lookups the views need (generated entities of a node,
// live values, leaves, rooms, power sources). Rebuilt on every hass update.

import type { PilotApi } from "../api/pilot-api";
import type { HomeAssistant } from "../types/home-assistant";
import type { LiveAggregator } from "./live-aggregator";
import {
  nodeKey,
  type CategoryId,
  type NodeInfo,
  type NodeKey,
  type PilotPayload,
  type PowerSourceInfo,
  type RoomNode,
  type TreeLeaf,
} from "./types";

export interface LeafPlace {
  leaf: TreeLeaf;
  room: RoomNode | null;
}

export class PanelModel {
  private readonly places = new Map<string, LeafPlace>();

  constructor(
    readonly hass: HomeAssistant,
    readonly payload: PilotPayload,
    readonly api: PilotApi,
    readonly aggregator: LiveAggregator,
  ) {
    for (const room of payload.tree.rooms) {
      for (const node of room.categories) {
        for (const leaf of node.leaves) this.places.set(leaf.entity_id, { leaf, room });
      }
    }
    for (const leaf of [...payload.tree.unassigned, ...payload.tree.ignored]) {
      this.places.set(leaf.entity_id, { leaf, room: null });
    }
  }

  get rooms(): RoomNode[] {
    return this.payload.tree.rooms;
  }

  room(areaId: string): RoomNode | undefined {
    return this.rooms.find((room) => room.area_id === areaId);
  }

  place(entityId: string): LeafPlace | undefined {
    return this.places.get(entityId);
  }

  node(key: NodeKey): NodeInfo | undefined {
    return this.payload.nodes[key];
  }

  /** Generated entity of a node, e.g. generated("salon", "sensor:power"). */
  generated(key: NodeKey, platformKind: string): string | undefined {
    return this.payload.entities[key]?.[platformKind];
  }

  number(entityId: string | undefined): number | null {
    if (!entityId) return null;
    const value = Number(this.hass.states[entityId]?.state);
    return Number.isFinite(value) ? value : null;
  }

  power(areaId: string | null, category?: CategoryId | null): number | null {
    return this.number(this.generated(nodeKey(areaId, category), "sensor:power"));
  }

  stripPower(leafId: string): number | null {
    return this.number(this.payload.strips[leafId]);
  }

  /** Power sources tied to a leaf (its meter, its WLED estimate, its nominal power). */
  sourcesFor(leaf: TreeLeaf): PowerSourceInfo[] {
    return this.payload.power.filter(
      (source) =>
        source.leaf_id === leaf.entity_id ||
        (leaf.device_id !== null &&
          source.kind === "measured" &&
          this.place(source.leaf_id)?.leaf.device_id === leaf.device_id),
    );
  }

  /** Power meters of a room, candidates for "already measured by". */
  meters(areaId: string): TreeLeaf[] {
    return (
      this.room(areaId)
        ?.categories.filter((node) => node.category === "power" || node.category === "switch")
        .flatMap((node) => node.leaves) ?? []
    );
  }

  areas(): Array<{ id: string; name: string }> {
    const fromHass = Object.values(this.hass.areas ?? {}).map((area) => ({
      id: area.area_id,
      name: area.name,
    }));
    const list = fromHass.length
      ? fromHass
      : this.rooms.map((room) => ({ id: room.area_id, name: room.name }));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  stateName(entityId: string): string {
    return (
      this.place(entityId)?.leaf.name ??
      this.hass.states[entityId]?.attributes.friendly_name ??
      entityId
    );
  }
}
