// ====== Code Summary ======
// LiveAggregator: turns tree nodes + the live Home Assistant states into the
// texts the panel shows (leaf value, category summary, room and home
// summaries). Pure logic, no DOM, unit-tested.

import type { HassEntityState } from "../types/home-assistant";
import { CATEGORIES } from "./categories";
import type { CategoryNode, HomeTree, RoomNode, TreeLeaf } from "./types";

type States = Record<string, HassEntityState | undefined>;

const UNAVAILABLE = new Set(["unavailable", "unknown"]);

export interface LeafView {
  text: string;
  active: boolean;
  available: boolean;
  /** CSS colour of the leaf when it is on (light colour if known). */
  glow: string | null;
}

export interface CategorySummary {
  text: string;
  active: number;
  total: number;
}

export interface RoomSummary {
  lightsOn: number;
  lightsTotal: number;
  power: number | null;
  temperature: { min: number; max: number } | null;
}

export class LiveAggregator {
  private readonly number: Intl.NumberFormat;

  constructor(locale: string) {
    this.number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  }

  formatNumber(value: number): string {
    return this.number.format(value);
  }

  leaf(leaf: TreeLeaf, states: States): LeafView {
    const state = states[leaf.entity_id];
    const meta = CATEGORIES[leaf.category];
    if (!state || UNAVAILABLE.has(state.state)) {
      return { text: "indisponible", active: false, available: false, glow: null };
    }
    if (meta.kind === "switchable") {
      const on = state.state === "on";
      const brightness = state.attributes.brightness;
      const rgb = state.attributes.rgb_color;
      const percent =
        on && typeof brightness === "number" ? Math.round((brightness / 255) * 100) : null;
      return {
        text: on ? (percent === null ? "allumée" : `${percent} %`) : "éteinte",
        active: on,
        available: true,
        glow: on ? (rgb ? `rgb(${rgb.join(",")})` : meta.color) : null,
      };
    }
    if (meta.kind === "binary") {
      const on = state.state === "on";
      const [onWord, offWord] = meta.binaryWords ?? ["on", "off"];
      return {
        text: on ? onWord : offWord,
        active: on,
        available: true,
        glow: on ? meta.color : null,
      };
    }
    const value = Number(state.state);
    const unit = state.attributes.unit_of_measurement ?? "";
    return {
      text: Number.isFinite(value) ? `${this.number.format(value)} ${unit}`.trim() : state.state,
      active: false,
      available: true,
      glow: null,
    };
  }

  category(node: CategoryNode, states: States): CategorySummary {
    const meta = CATEGORIES[node.category];
    const total = node.leaves.length;
    if (meta.kind === "switchable" || meta.kind === "binary") {
      const active = node.leaves.filter((leaf) => states[leaf.entity_id]?.state === "on").length;
      return { text: `${active}/${total}`, active, total };
    }
    const values = this.numbers(node.leaves, states);
    if (values.length === 0) return { text: "—", active: 0, total };
    const unit = this.unit(node.leaves, states);
    if (meta.kind === "sum") {
      const sum = values.reduce((acc, value) => acc + value, 0);
      return { text: `${this.number.format(sum)} ${unit}`.trim(), active: 0, total };
    }
    if (meta.kind === "lowest") {
      return {
        text: `min ${this.number.format(Math.min(...values))} ${unit}`.trim(),
        active: 0,
        total,
      };
    }
    const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
    return { text: `${this.number.format(mean)} ${unit}`.trim(), active: 0, total };
  }

  /** min / mean / max of a measure category, or null without valid values. */
  range(node: CategoryNode, states: States): { min: number; mean: number; max: number } | null {
    const values = this.numbers(node.leaves, states);
    if (values.length === 0) return null;
    const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
    return { min: Math.min(...values), mean, max: Math.max(...values) };
  }

  room(room: RoomNode, states: States): RoomSummary {
    const find = (id: string) => room.categories.find((node) => node.category === id);
    const lights = [find("light"), find("led")].flatMap((node) => node?.leaves ?? []);
    const powerNode = find("power");
    const temperatureNode = find("temperature");
    const powerValues = powerNode ? this.numbers(powerNode.leaves, states) : [];
    const range = temperatureNode ? this.range(temperatureNode, states) : null;
    return {
      lightsOn: lights.filter((leaf) => states[leaf.entity_id]?.state === "on").length,
      lightsTotal: lights.length,
      power: powerValues.length ? powerValues.reduce((acc, value) => acc + value, 0) : null,
      temperature: range ? { min: range.min, max: range.max } : null,
    };
  }

  home(tree: HomeTree, states: States): RoomSummary {
    const rooms = tree.rooms.map((room) => this.room(room, states));
    const temps = rooms.flatMap((room) => (room.temperature ? [room.temperature] : []));
    const powers = rooms.flatMap((room) => (room.power === null ? [] : [room.power]));
    return {
      lightsOn: rooms.reduce((acc, room) => acc + room.lightsOn, 0),
      lightsTotal: rooms.reduce((acc, room) => acc + room.lightsTotal, 0),
      power: powers.length ? powers.reduce((acc, value) => acc + value, 0) : null,
      temperature: temps.length
        ? { min: Math.min(...temps.map((t) => t.min)), max: Math.max(...temps.map((t) => t.max)) }
        : null,
    };
  }

  private numbers(leaves: TreeLeaf[], states: States): number[] {
    return leaves
      .map((leaf) => Number(states[leaf.entity_id]?.state))
      .filter((value) => Number.isFinite(value));
  }

  private unit(leaves: TreeLeaf[], states: States): string {
    for (const leaf of leaves) {
      const unit = states[leaf.entity_id]?.attributes.unit_of_measurement;
      if (unit) return unit;
    }
    return "";
  }
}
