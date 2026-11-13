// ====== Code Summary ======
// The small part of the Home Assistant frontend object the panel relies on.

export interface HomeAssistant {
  language: string;
  callWS<T>(message: { type: string; [key: string]: unknown }): Promise<T>;
}
