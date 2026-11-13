// ====== Code Summary ======
// Shapes of the payload sent by vivid_pilot/subscribe (mirror of
// custom_components/vivid_pilot/api/payload.py and tree/model.py).

export type CategoryId =
  | "light"
  | "led"
  | "switch"
  | "door"
  | "window"
  | "presence"
  | "temperature"
  | "humidity"
  | "pressure"
  | "co2"
  | "power"
  | "ignored";

export interface LeafOptions {
  nominal_power?: number;
  voltage?: number;
  upstream?: string;
  counted?: boolean;
  power_source?: PowerSourceKind;
}

export type PowerSourceKind = "auto" | "measured" | "wled" | "nominal" | "none";

export interface PowerChoice {
  available: PowerSourceKind[];
  chosen: PowerSourceKind;
  effective: PowerSourceKind;
}

export interface TreeLeaf {
  entity_id: string;
  name: string;
  category: CategoryId;
  source: "auto" | "manual";
  reason: string;
  device_id: string | null;
  platform?: string;
  options?: LeafOptions;
}

export interface CategoryNode {
  category: CategoryId;
  leaves: TreeLeaf[];
}

export interface RoomNode {
  area_id: string;
  name: string;
  icon: string | null;
  floor_id: string | null;
  categories: CategoryNode[];
}

export interface HomeTree {
  rooms: RoomNode[];
  unassigned: TreeLeaf[];
  ignored: TreeLeaf[];
}

export interface NodeSettings {
  memory_enabled: boolean;
  memory_categories: CategoryId[];
  memory_excluded: string[];
  group_excluded: string[];
}

export interface MemorySummary {
  active: boolean;
  saved_at: string | null;
  count: number;
  on: number;
  colors: [number, number, number][];
  members: string[];
}

export interface NodeInfo {
  settings: NodeSettings;
  memory: MemorySummary;
  group: string[];
}

export interface PowerSourceInfo {
  kind: "measured" | "wled" | "nominal";
  area_id: string;
  category: CategoryId | null;
  entity_id: string;
  leaf_id: string;
  counted: boolean;
  factor: number;
  value: number | null;
}

export interface PilotPayload {
  version: string;
  tree: HomeTree;
  nodes: Record<string, NodeInfo>;
  /** node key -> "platform:kind" -> generated entity id */
  entities: Record<string, Record<string, string>>;
  /** strip light -> its computed power sensor */
  strips: Record<string, string>;
  power: PowerSourceInfo[];
  /** light / LED / switch leaf -> its power source choice */
  power_choices: Record<string, PowerChoice>;
  settings: { memory_master: boolean; memory_debounce: number };
}

/** "all", "<area>", "all__<cat>" or "<area>__<cat>" */
export type NodeKey = string;

export function nodeKey(areaId: string | null, category?: CategoryId | null): NodeKey {
  const base = areaId ?? "all";
  return category ? `${base}__${category}` : base;
}

export function parseNodeKey(key: NodeKey): { areaId: string | null; category: CategoryId | null } {
  const [base, category] = key.split("__");
  return {
    areaId: base === "all" ? null : base,
    category: (category as CategoryId | undefined) ?? null,
  };
}
