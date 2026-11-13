<p align="center"><img src="https://raw.githubusercontent.com/Florian-BARRE/vivid-pilot/main/docs/assets/logo.png" width="120" alt="Vivid Pilot logo" /></p>

# Vivid Pilot

Home Assistant integration of the Vivid family (companion of [Vivid Cards](https://github.com/Florian-BARRE/vivid-cards)).

Vivid Pilot reads your areas and devices, guesses what each one is (LED strip, lamp, outlet, door, window, presence, power meter…), and builds per-room groups, aggregates and LED power for you. It remembers the last light state of every room; your own automations just call the generated groups and scenes. Everything is configured from a sidebar panel: every detection is visible and can be corrected.

> **Status: 0.4.1, in active development.** Detection, corrections, generated entities, power and memories are in; see [the roadmap](docs/architecture.md#phases).

## Modules

- **Rooms**: auto-detected roles per area, manual corrections, light groups, door / window / presence aggregates, room power without double counting, WLED power from the estimated current and the strip voltage.
- **Memory & scenes**: last light state per room, kept up to date continuously and persisted across restarts; turning the room on restores it.
- **Utilities**: more helpers later.

## Installation (HACS)

1. HACS → three dots → *Custom repositories* → `https://github.com/Florian-BARRE/vivid-pilot`, category *Integration*.
2. Download **Vivid Pilot**, restart Home Assistant.
3. *Settings → Devices & services → Add integration → Vivid Pilot*.
4. Open **Vivid Pilot** in the sidebar (administrators only).

## Development

See [AGENTS.md](AGENTS.md) for the conventions and [docs/architecture.md](docs/architecture.md) for the design.

```bash
uv sync                       # Python tools + Home Assistant test harness
uv run pytest                 # tests
uv run ruff check . && uv run ruff format --check .

cd frontend && npm ci
npm run build                 # writes custom_components/vivid_pilot/frontend/vivid-pilot-panel.js
```

## License

MIT
