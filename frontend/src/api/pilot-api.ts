// ====== Code Summary ======
// PilotApi: typed wrapper around the websocket commands of the integration.
// The panel never builds websocket messages itself.

import { WS_TYPE_INFO } from "../constants";
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
}
