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
- Rooms engine (to come): a `RoomRegistry` recomputes rooms → members → roles from the registries and the overrides, then adds or removes generated entities.

## Generated entities

- Each room gets a virtual device "Room · <name>" placed in its area; every entity generated for the room belongs to it.
- Stable `unique_id`: `<area_id>__<role>`. A `translation_key` per role (`room_lights`, `room_leds`, `room_lamps`, `room_doors`, `room_windows`, `room_presence`, `room_power`, `room_temperature`, `room_humidity`, `room_co2`, `room_pressure`, `room_auto_lighting`).
- Vivid Cards discovers them by area + platform `vivid_pilot` + `translation_key`, so entity ids are cosmetic and can be renamed freely.
- House-level aggregates belong to a "Home" device without area.

## Roles (auto-detection)

| Role | Detection |
|---|---|
| `led` | `light` from the `wled` platform (or a platform configured as strip) |
| `lamp` | other `light` |
| `outlet` | `switch` with device class `outlet` |
| `switch` | other `switch` |
| `door` / `window` | `binary_sensor` `door` / `window` (`opening` → to classify) |
| `presence` | `binary_sensor` `motion` / `occupancy` / `presence` |
| `power` | `sensor` with device class `power` |
| `climate_*` | temperature, humidity, CO₂, pressure |
| `ignored` | manual |

Typical correction: an outlet driving a lamp → `lamp` (on/off member of the light groups and of the room memory).

## Power

- WLED strips: power (W) = estimated current (mA, WLED sensor found by device + `translation_key`) / 1000 × strip voltage (set per strip in the panel, default 5 V). It is an estimate that depends on WLED's current limiter setting.
- No double counting: each power source can declare an **upstream meter** ("already measured by…", e.g. a strip powered through a metering plug). A source with an upstream meter is left out of totals but keeps its own sensor. Each source can also be included or excluded from its room total.

## Room memory

- Updated continuously: any state or attribute change of a room light, debounced per room (2 s default), stores the state of all the room's lights — only when at least one is on and none is unavailable, never during a turn-off.
- Persisted in the store (survives restarts, unlike `scene.create`).
- `light.turn_on` on the room's `room_lights` entity with no data restores the memory through `helpers.state.async_reproduce_state`; with data it behaves like a normal group.
- Configurable fallback when empty; services `vivid_pilot.save` / `restore` / `forget` targeting an area; lights can be excluded from the memory.

## Automations

- Presence lighting per room: presence sensors (auto, editable), turn-off delay, enabled by the room's `room_auto_lighting` switch. Presence → restore the memory if the room is fully off; no presence for the delay → turn off.
- To decide: illuminance condition, time windows, "respect manual off".

## Phases

0. Skeleton: config entry, store, panel, websocket, CI, release. ✅ (0.1.0)
1. Registries, detection, virtual room devices, read-only panel.
2. Corrections in the panel (roles, rooms, exclusions, upstream meters, voltages).
3. Entities: light groups, openings, presence, climate, power.
4. Memory, restoring `room_lights`, services.
5. Presence automation.
6. Vivid Cards discovery by area + role, then migration of Flo's Home Assistant.
