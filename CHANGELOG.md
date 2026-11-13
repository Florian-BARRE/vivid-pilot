# Changelog

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
