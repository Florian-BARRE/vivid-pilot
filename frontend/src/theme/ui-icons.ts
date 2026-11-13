// ====== Code Summary ======
// UI_ICONS: the stroke icons of the panel's own controls (tabs, view modes,
// actions, states), drawn on a 24 px grid like the category icons and shown
// with renderIcon. Category icons stay in tree/categories.ts.

export const UI_ICONS = {
  /** Tabs. */
  tree: "M4 4h6v5H4zM14 15h6v5h-6zM14 4h6v5h-6zM7 9v8.5h7M10 6.5h4",
  memory: "M3 12a9 9 0 1 0 2.6-6.4M3 4v5h5M12 8v4l3 2",
  utilities:
    "M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  /** View modes. */
  cards: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  graph:
    "M3 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0M17 5a2 2 0 1 0 4 0 2 2 0 1 0-4 0M17 19a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7 12h3M10 12l7-6.5M10 12l7 6.5",
  /** Actions. */
  restore: "M3 12a9 9 0 1 0 2.6-6.4M3 4v5h5M10 9.5v5l4-2.5z",
  power: "M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0",
  sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4",
  save: "M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7",
  forget: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  refresh: "M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4",
  close: "M6 6l12 12M18 6L6 18",
  /** Values and states. */
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.6.5.8 1.2.8 1.9V16h6v-.5c0-.7.2-1.4.8-1.9A6 6 0 0 0 12 3z",
  thermometer: "M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  pencil: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  /** Places. */
  inbox: "M4 13l2.5-8h11L20 13v6H4zM4 13h4.5l1 2h5l1-2H20",
  hidden:
    "M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c5 0 8.5 4 9.5 6a13 13 0 0 1-2.6 3.4M6.4 7.4A13 13 0 0 0 2.5 12c1 2 4.5 6 9.5 6a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  device: "M7 3h10v18H7zM11 18h2",
  entity: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
} as const;

export type UiIcon = keyof typeof UI_ICONS;
