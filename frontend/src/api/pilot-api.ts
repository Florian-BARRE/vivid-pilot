// ====== Code Summary ======
// PilotApi: typed wrapper around the websocket commands of the integration
// (custom_components/vivid_pilot/api/websocket.py). The panel never builds
// websocket messages itself.

import { WS_PREFIX } from "../constants";
import type { CategoryId, LeafOptions, NodeKey, PilotPayload } from "../tree/types";
import type { HomeAssistant } from "../types/home-assistant";

export interface NodeUpdate {
  memory_enabled?: boolean;
  memory_categories?: CategoryId[];
  memory_excluded?: string[];
  group_excluded?: string[];
}

export class PilotApi {
  constructor(private readonly hass: HomeAssistant) {}

  private call<T = unknown>(command: string, data: Record<string, unknown> = {}): Promise<T> {
    return this.hass.callWS<T>({ type: `${WS_PREFIX}/${command}`, ...data });
  }

  /** Receive the payload now and after every change; resolves to the unsubscribe function. */
  subscribe(onPayload: (payload: PilotPayload) => void): Promise<() => Promise<void>> {
    return this.hass.connection.subscribeMessage<PilotPayload>(onPayload, {
      type: `${WS_PREFIX}/subscribe`,
    });
  }

  rescan(): Promise<unknown> {
    return this.call("rescan");
  }

  setCategory(entityId: string, category: CategoryId | null): Promise<unknown> {
    return this.call("leaf/update", { entity_id: entityId, category });
  }

  setOptions(
    entityId: string,
    options: { [K in keyof LeafOptions]: LeafOptions[K] | null },
  ): Promise<unknown> {
    return this.call("leaf/update", { entity_id: entityId, options });
  }

  resetLeaf(entityId: string): Promise<unknown> {
    return this.call("leaf/update", { entity_id: entityId, reset: true });
  }

  moveLeaf(entityId: string, areaId: string | null, scope: "device" | "entity"): Promise<unknown> {
    return this.call("leaf/area", { entity_id: entityId, area_id: areaId, scope });
  }

  updateNode(node: NodeKey, update: NodeUpdate): Promise<unknown> {
    return this.call("node/update", { node, ...update });
  }

  memory(action: "restore" | "forget", node: NodeKey): Promise<boolean | null> {
    return this.call<boolean | null>(`memory/${action}`, { node });
  }

  /** Store now; reason is "saved", "disabled" or "nothing_on". */
  saveMemory(node: NodeKey): Promise<{ saved: boolean; reason: string }> {
    return this.call("memory/save", { node });
  }

  group(action: "turn_on" | "turn_off", node: NodeKey): Promise<unknown> {
    return this.call(`group/${action}`, { node });
  }

  updateSettings(settings: {
    memory_master?: boolean;
    memory_debounce?: number;
    battery_low?: number;
  }): Promise<unknown> {
    return this.call("settings/update", settings);
  }
}
