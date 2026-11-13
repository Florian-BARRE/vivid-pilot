// ====== Code Summary ======
// Display metadata of each category: French label, stroke icon path, accent
// colour and how its leaves aggregate (switchable, binary, measure, sum,
// lowest).

import type { CategoryId } from "./types";

export type AggregateKind = "switchable" | "binary" | "measure" | "sum" | "lowest";

export interface CategoryMeta {
  label: string;
  icon: string;
  color: string;
  kind: AggregateKind;
  /** Words for a binary leaf: [on, off]. */
  binaryWords?: [string, string];
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  light: {
    label: "Lampes",
    icon: "M8 2h8l3 9H5zM12 11v9M8 21h8",
    color: "#f5b042",
    kind: "switchable",
  },
  led: {
    label: "LEDs",
    icon: "M3 9h18v6H3zM7 12h.01M11 12h.01M15 12h.01M19 12h.01",
    color: "#b07cff",
    kind: "switchable",
  },
  switch: {
    label: "Interrupteurs",
    icon: "M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4",
    color: "#5aa9ff",
    kind: "switchable",
  },
  door: {
    label: "Portes",
    icon: "M6 21V3h12v18M3 21h18M14 12h.01",
    color: "#2ec4b6",
    kind: "binary",
    binaryWords: ["ouverte", "fermée"],
  },
  window: {
    label: "Fenêtres",
    icon: "M4 3h16v18H4zM12 3v18M4 12h16",
    color: "#4dd0e1",
    kind: "binary",
    binaryWords: ["ouverte", "fermée"],
  },
  presence: {
    label: "Présence",
    icon: "M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 21l2-7-2-3 3-3 3 3 2 1M11 14l4 7",
    color: "#7bd88f",
    kind: "binary",
    binaryWords: ["détectée", "personne"],
  },
  temperature: {
    label: "Température",
    icon: "M14 14.76V4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0z",
    color: "#ffa726",
    kind: "measure",
  },
  humidity: {
    label: "Humidité",
    icon: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
    color: "#29a3e0",
    kind: "measure",
  },
  pressure: {
    label: "Pression",
    icon: "M12 14l3-3M4 18a9 9 0 1 1 16 0",
    color: "#a58ce0",
    kind: "measure",
  },
  co2: {
    label: "CO₂",
    icon: "M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z",
    color: "#9ccc65",
    kind: "measure",
  },
  illuminance: {
    label: "Éclairement",
    icon: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    color: "#ffca28",
    kind: "measure",
  },
  battery: {
    label: "Batteries",
    icon: "M7 6h10v15H7zM10 3h4v3M10 14h4",
    color: "#66bb6a",
    kind: "lowest",
  },
  power: {
    label: "Puissance",
    icon: "M13 2L4 14h7l-1 8 9-12h-7z",
    color: "#ffd54f",
    kind: "sum",
  },
  ignored: {
    label: "Ignorés",
    icon: "M5 5l14 14M19 5L5 19",
    color: "#9e9e9e",
    kind: "binary",
  },
};

/** Detection reason from the integration (English), told in French. */
export function reasonLabel(reason: string): string {
  const platform = /^light from the (.+) platform$/.exec(reason);
  if (platform) return `lumière de la plateforme ${platform[1]} (bandeau LED)`;
  const deviceClass = /^device class (.+)$/.exec(reason);
  if (deviceClass) return `classe d'appareil « ${deviceClass[1]} »`;
  const words: Record<string, string> = {
    light: "entité lumière",
    switch: "entité interrupteur",
    "set by hand": "choisi à la main",
  };
  return words[reason] ?? reason;
}
