// ====== Code Summary ======
// The small part of the Home Assistant frontend object the panel relies on.

export interface HassEntityState {
  entity_id: string;
  state: string;
  last_changed?: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    unit_of_measurement?: string;
    brightness?: number;
    rgb_color?: [number, number, number];
  };
}

export interface HassArea {
  area_id: string;
  name: string;
}

export interface HassConnection {
  subscribeMessage<T>(
    callback: (message: T) => void,
    message: { type: string; [key: string]: unknown },
  ): Promise<() => Promise<void>>;
}

export interface HomeAssistant {
  language: string;
  states: Record<string, HassEntityState>;
  areas?: Record<string, HassArea>;
  connection: HassConnection;
  callWS<T>(message: { type: string; [key: string]: unknown }): Promise<T>;
}
