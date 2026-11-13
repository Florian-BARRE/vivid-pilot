# Vivid Pilot — architecture

Vivid Pilot scans the Home Assistant registries, groups devices by room (HA areas), guesses their role, builds groups, aggregates and LED power, keeps the last light state of each room and runs the automations around it. Everything is configured from a sidebar panel, with no YAML and no hand-made helpers.

## Principles

1. **Auto first, corrected by hand.** Everything is detected, every detection is visible in the panel, and everything can be corrected: role, room, exclusion, manual addition.
2. **Corrections always win** over detection; they are stored and survive restarts and rescans.
3. **Area membership, never ids or names.** A device belongs to a room because it is in that area (an entity's own area wins over its device's). Roles come from the registries: platform, device class, supported features. Generated entities are attached to the room's area too, and are found by area + role.
4. **Live.** Entity, device and area registry updates trigger a recompute; a lamp added to the "Living room" area joins it without a restart.
5. **Modular.** Independent modules: Rooms, Memory & scenes, Automations, then Utilities. A new module never changes the others.

## Building blocks

- One config entry (`single_config_entry`); the config flow only confirms.
- Sidebar panel (admin only): a Lit web component registered with `panel_custom`, served from `custom_components/vivid_pilot/frontend`, talking to the integration through websocket commands (`vivid_pilot/…`). One tab per module.
- `PilotStore` (`helpers.storage.Store`, `.storage/vivid_pilot`): overrides, settings and room memories.
- `PilotRuntime`: composition root; builds and starts every module.
- Tree engine (to come): a `PilotTree` recomputes all → rooms → categories → entities from the registries and the overrides, then adds or removes generated entities.

## Tree model

Everything Vivid Pilot builds hangs off one tree, rebuilt live from the areas and the detected categories:

```
all                                  the whole home
└── <room>                           one node per HA area (e.g. salon)
    ├── light       lamps and bulbs (plus outlets reclassified as light)
    ├── led         LED strips (WLED)
    ├── switch      switches and outlets that are not lights
    ├── door / window
    ├── presence
    └── temperature / humidity / pressure / co2
```

- **Leaves are the real HA entities**; every other node is generated. A node exists only while it has at least one member and disappears when empty.
- **Categories** (auto-detected, corrected by hand in the panel):

  | Category | Detection |
  |---|---|
  | `light` | `light` not from a strip platform (lamps, bulbs) |
  | `led` | `light` from the `wled` platform (or a platform configured as strip) |
  | `switch` | `switch` entities (outlets included) |
  | `door` / `window` | `binary_sensor` `door` / `garage_door` / `window`; generic `opening` contacts default to `window` |
  | `presence` | `binary_sensor` `motion` / `occupancy` / `presence` |
  | `temperature` / `humidity` / `pressure` / `co2` | `sensor` with the matching device class |
  | `power` sources | `sensor` with device class `power`, plus computed WLED power |
  | `ignored` | manual |

  Never candidates: disabled entities, entities hidden by an integration (e.g. the switch behind a `switch_as_x` light), configuration / diagnostic entities, `group` entities and Vivid Pilot's own entities.

  `light` and `led` are siblings, never nested. Typical correction: an outlet driving a lamp moves from `switch` to `light` (on/off member).
- **Aggregates go up one level at a time**: category → room → `all`. Commands are always sent straight to the leaves and node states are computed from the leaves, so there is no group-of-groups lag.

## Generated entities

Entity ids use the `vivid_pilot_` prefix (HA forbids hyphens in entity ids): `vivid_pilot_<room>_<category>[_<suffix>]`, and `vivid_pilot_all_…` at the top. Display names stay readable ("Salon · Lumières · État").

| Node | Entities |
|---|---|
| `<room>/light`, `<room>/led` | `light.vivid_pilot_<room>_<cat>` (group), `scene.vivid_pilot_<room>_<cat>_state` (memory), `sensor.vivid_pilot_<room>_<cat>_power` |
| WLED strip (leaf) | `sensor.vivid_pilot_<strip>_power` = estimated current × voltage |
| `<room>/switch` | `switch.vivid_pilot_<room>_switch`, `scene…_switch_state` (memory), `sensor…_switch_power` |
| `<room>/door`, `window`, `presence` | `binary_sensor.vivid_pilot_<room>_<cat>`: `on` if any member is on; attributes `count_on`, `members_on` |
| `<room>/temperature` (same for humidity, pressure, co2) | three sensors: `…_temperature` (mean), `…_temperature_min`, `…_temperature_max`; attributes name the sensor holding the min / max |
| `<room>` | `light.vivid_pilot_<room>`, `scene.vivid_pilot_<room>_state`, `sensor.vivid_pilot_<room>_power` |
| `all` | the same aggregates over every room (`scene.vivid_pilot_all_state`, `sensor.vivid_pilot_all_power`, min / mean / max of each climate measure…) |

- Each room has a virtual device "Room · <name>" placed in its area; its generated entities belong to it. `all` entities belong to a "Home" device without area.
- Stable `unique_id`s: `<area_id>__<category>__<kind>` (`all` for the top). A `translation_key` per kind, so Vivid Cards finds entities by area + platform `vivid_pilot` + `translation_key`; renaming entity ids never breaks a card.
- Climate min / max / mean are three separate sensors on purpose: only an entity's state gets long-term statistics, history graphs and the 7-day / 30-day charts Vivid Cards reads; attributes would be lost after the recorder purge. Min / max over time is not a separate entity: the long-term statistics of each sensor already keep the hourly min / mean / max.

## Power

- WLED strips: power (W) = estimated current (mA, WLED sensor found by device + `translation_key`) / 1000 × strip voltage (set per strip in the panel, default 5 V). It is an estimate that depends on WLED's current limiter setting.
- No double counting: each power source can declare an **upstream meter** ("already measured by…", e.g. a strip powered through a metering plug). A source with an upstream meter is left out of totals but keeps its own sensor. Each source can also be included or excluded from its totals.
- Sums go up the tree: category → room → `all`.
- **Nominal power** (agreed 13 November 2026): a light or switch with no power information at all (e.g. a Hue bulb) can get a power set by hand in the panel, counted while it is on (optionally scaled by brightness).

## Memory (state of each node)

- **Every light / led / switch node and every room and `all` has its own memory**, exposed as `scene.vivid_pilot_…_state`. Activating the scene restores it; `light.turn_on` on the node's group with no data does the same; with data it behaves like a normal group.
- **Configurable per node**, at every level:
  - which categories the memory covers (default: `light` + `led`; `switch` can be added);
  - which detected members are excluded ("every light except this one").
  The group (what turning the node on / off commands) and the memory (what is restored) are separate lists, so a night light can be switched off with the room without being restored.
- **Updated continuously**: any state or attribute change of a member, debounced per node (2 s default), stores the state of the node's memory members — only when at least one is on and none is unavailable, never during a turn-off. Each node follows the rule independently: turning the LEDs off while the lamps stay on updates `salon_state` to "lamps on, LEDs off" while `salon_led_state` keeps the last LED colours.
- Persisted in the store (survives restarts, unlike `scene.create`); restored through `helpers.state.async_reproduce_state`.
- Configurable fallback when empty; services `vivid_pilot.save` / `restore` / `forget` targeting a node.

## Panel

- The tree as an expandable graph: `all` → rooms → categories → entities.
- Per entity: category (menu or drag and drop), "counted in totals" and upstream meter, voltage for WLED strips, live value.
- Per node: its aggregates, its memory settings (categories, exclusions), a preview of the stored state with Restore / Forget.
- "Unassigned" section for devices without area; changing a room edits the HA area so the area stays the single source of truth.

## Automations

- Presence lighting per room: presence sensors (auto, editable), turn-off delay, enabled by `switch.vivid_pilot_<room>_auto_lighting`. Presence → restore the memory if the room is fully off; no presence for the delay → turn off.
- To decide: illuminance condition, time windows, "respect manual off".

## Phases

0. Skeleton: config entry, store, panel, websocket, CI, release. ✅ (0.1.0)
1. Registries, detection, live tree, read-only panel (the tree with live values) — `feature/phase-1-tree`, awaiting validation.
2. Corrections in the panel (categories, rooms, exclusions, upstream meters, voltages).
3. Virtual room devices and entities: light / led / switch groups, openings, presence, climate, power, up to `all`.
4. Memory per node (scenes, settings, services).
5. Presence automation.
6. Vivid Cards discovery by area + role, then migration of Flo's Home Assistant.
