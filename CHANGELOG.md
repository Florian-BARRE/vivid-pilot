# Changelog

## 0.5.2 — 2026-11-13

- **Lamp and LED groups offer their members' colors**: color modes, color, color temperature and effects are merged like a Home Assistant light group, so a card (or the more-info dialog) shows the color picker and the effect list of a WLED group. Setting a color or an effect on the group sets it on every member.

## 0.5.1 — 2026-11-13

- "Lights" are called lamps everywhere (entity names and panel), with a lamp icon: lamps, LEDs and switches stay three distinct things, as in Vivid Cards.

## 0.5.0 — 2026-11-13

- **Illuminance** category: mean, min and max per room and for the home.
- **Batteries** category, diagnostic battery sensors included: lowest level per room and for the home, with the low batteries listed; the low threshold (default 20 %) is set in Utilities.
- **Energy (kWh)** next to every power sensor (room, category, home): the power integrated over time, restored after restarts, usable in the Energy dashboard.
- **Card contract**: every generated entity carries `vivid_pilot_node` and `vivid_pilot_kind`, so Vivid Cards finds them without reading names.

## 0.4.1 — 2026-11-13

- **No combined "Éclairage" group** any more, in the rooms or at home: lights and LEDs stay distinct. The home gets its own Lumières, LEDs and Interrupteurs groups. The old `light.vivid_pilot_<room>` and `light.vivid_pilot_all` entities are removed.
- The power card of a node becomes **"Puissance calculée"**: only what Vivid Pilot computes (WLED estimates, nominal powers), with live values; measured meters stay in their own card. A WLED line shows its generated power sensor.

## 0.4.0 — 2026-11-13

- **Presence lighting removed**: automations belong in Home Assistant; the `switch.vivid_pilot_<room>_auto_lighting` entities and the Automations tab are gone, and entities Vivid Pilot no longer generates are removed from the registry.
- **Memorise gives feedback**: the panel says when nothing was stored because nothing is on, or because the memory is disabled. Unavailable members no longer block a capture.
- Memory tab explains when a state is stored automatically.
- **Power sources card** in each node: measured meters, WLED estimates and nominal powers with their live value and whether they are counted.

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
