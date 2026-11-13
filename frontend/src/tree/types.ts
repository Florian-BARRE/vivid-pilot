// ====== Code Summary ======
// Shapes of the tree sent by vivid_pilot/tree/subscribe (mirror of
// custom_components/vivid_pilot/tree/model.py to_dict()).

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

export interface TreeLeaf {
  entity_id: string;
  name: string;
  category: CategoryId;
  source: "auto" | "manual";
  reason: string;
  device_id: string | null;
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
