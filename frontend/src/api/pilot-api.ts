// ====== Code Summary ======
// PilotApi: typed wrapper around the websocket commands of the integration.
// The panel never builds websocket messages itself.

import { WS_TYPE_INFO, WS_TYPE_TREE_SUBSCRIBE } from "../constants";
import type { HomeTree } from "../tree/types";
import type { HomeAssistant } from "../types/home-assistant";

/** Answer of the vivid_pilot/info command. */
export interface PilotInfo {
  version: string;
  overrides: number;
  memories: number;
}

export class PilotApi {
  constructor(private readonly hass: HomeAssistant) {}

  /** Read the integration version and storage counters. */
  fetchInfo(): Promise<PilotInfo> {
    return this.hass.callWS<PilotInfo>({ type: WS_TYPE_INFO });
  }

  /** Receive the tree now and after every rebuild; resolves to the unsubscribe function. */
  subscribeTree(onTree: (tree: HomeTree) => void): Promise<() => Promise<void>> {
    return this.hass.connection.subscribeMessage<HomeTree>(onTree, {
      type: WS_TYPE_TREE_SUBSCRIBE,
    });
  }
}
