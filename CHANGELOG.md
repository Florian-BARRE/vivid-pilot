# Changelog

## 0.3.2 — 2026-11-13

- **Power source per light / LED / switch**, chosen in its sheet: Auto, existing meter, WLED estimate (estimated current × strip voltage), nominal power, or none. Choosing anything but the meter takes the device's meter out of totals, so an old template power sensor can be replaced without deleting it.
- The strip voltage only shows when the WLED estimate is used; the nominal power only when it is.

## 0.3.1 — 2026-11-13

- Graph view uses the whole width of the panel.
- Detection reasons shown in French in the panel.

## 0.3.0 — 2026-11-13

- **Corrections from the panel**: every entity opens a sheet to change its category (or ignore it), move it to another room (its device, or the entity alone — this edits the HA area), and set its power options.
- **Generated entities**, attached to one virtual device per room placed in the room's area, all prefixed `vivid_pilot_`:
  - light groups for the home, each room, each room's lights and LEDs; switch group per room — turning a node on with no parameter restores its memory;
  - doors / windows / presence (on if any member is on);
  - climate mean, min and max (separate sensors, so each keeps long-term statistics);
  - power per room, category and home, without double counting: measured meters, WLED strips (estimated current × strip voltage), nominal power set by hand for unmetered lights, upstream meters and "counted" switch;
  - one scene per memory node (`…_state`).
- **Memory per node**: continuous, debounced, persisted; never stores an "all off" state; configurable categories and exclusions per node, separate group / memory membership; global switch and delay; services `vivid_pilot.save / restore / forget`.
- **Presence lighting** per room (off by default): restore on presence, turn off after a delay without presence.
- **Panel**: clickable categories, list or graph view, entity sheet, Memory tab (consult, enable / disable, restore, forget, settings), Automations tab, Utilities tab (rescan, generated entities, corrections). Logo with the Pilot badge. Layout fixes for long entity ids.
- Entities no integration provides any more (left in the registry) are left out; the tree is rebuilt once Home Assistant has fully started.

## 0.2.0 — 2026-11-13

- Registry-based detection: every entity is placed in the room of its area (its own, else its device's) and given a category (light, LED, switch, door, window, presence, temperature, humidity, pressure, CO₂, power) from its domain, platform and device class — never from its id or name.
- Live tree (Home → rooms → categories → entities), rebuilt automatically when entities, devices or areas change; manual overrides from the store win over detection.
- Left out: disabled entities, entities hidden by an integration, configuration / diagnostic entities, group entities.
- Websocket commands `vivid_pilot/tree/get` and `vivid_pilot/tree/subscribe`.
- Read-only panel: the tree, each node's categories with live values, "Sans pièce" and "Ignorés"; colours follow the Home Assistant theme (light, dark, custom).

## 0.1.0 — 2026-11-13

- Project skeleton: single config entry, persistent store, sidebar panel (Lit) connected through the `vivid_pilot/info` websocket command.
- Tooling: uv, ruff, pytest (pytest-homeassistant-custom-component), Vite + TypeScript + ESLint + Prettier for the panel.
- CI: checks, hassfest + HACS validation, automatic release with a HACS zip.
