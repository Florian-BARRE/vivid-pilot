# AGENTS.md — conventions of the Vivid Pilot repository

Read this before changing anything. The design lives in `docs/architecture.md`.

## Layout

| Path | Role |
|---|---|
| `custom_components/vivid_pilot/` | The integration (what HACS installs) |
| `├── __init__.py` | Thin entry point: builds and starts `PilotRuntime` |
| `├── runtime.py` | Composition root: builds every object with injected settings |
| `├── const.py` | Constants only |
| `├── config_flow.py` | One confirmation step; settings live in the panel |
| `├── storage/` | `PilotStore` — the only persistence point (`.storage/vivid_pilot`) |
| `├── panel/` | `PanelRegistrar` — serves the bundle, adds the sidebar panel |
| `├── api/` | `PilotWebsocketApi` — commands called by the panel |
| `├── tree/` | Categories, `CategoryDetector`, `TreeBuilder`, live `PilotTree` (all → room → category → entities) |
| `├── frontend/` | Built panel bundle (generated, not committed) |
| `frontend/` | Panel sources (Lit + TypeScript + Vite) |
| `tests/` | pytest with `pytest-homeassistant-custom-component` |
| `scripts/` | Release helpers (`check_versions.py`) |
| `docs/` | Architecture and module documentation |

New modules (rooms, memory, automations, utilities) each get their own sub-package under `custom_components/vivid_pilot/` with a facade `__init__.py`, and are built in `runtime.py`.

## Rules

- **Code, comments and identifiers in English.** User-facing texts go through translations (`strings.json`, `translations/fr.json`, `translations/en.json`; French first for the panel).
- **Rooms come from area membership, never from entity ids or names.** Roles come from the registries (platform, device class, supported features). Generated entities follow the tree (all → room → category, see `docs/architecture.md`), use the `vivid_pilot_` entity id prefix, belong to a per-room virtual device placed in the area, and have stable `unique_id`s (`<area_id>__<category>__<kind>`) and a `translation_key` per kind.
- Every file starts with a `====== Code Summary ======` header, 400 lines max, one main class per file, settings injected through constructors (only `runtime.py` assembles them).
- Logs narrate `START <operation> (key=value)` / `END …`, no secrets.
- **Version source of truth: `manifest.json`.** `pyproject.toml` and `frontend/package.json` must match (`scripts/check_versions.py`, enforced in CI).

## Tooling choices (deviations from the default stack, on purpose)

- **Logging uses the standard `logging` module**, not loggerplusplus: Home Assistant integrations must log through `logging.getLogger(__name__)` so users control levels from `configuration.yaml`, and an integration should not ship extra runtime requirements.
- **No configplusplus**: an integration has no environment or config files of its own; settings come from the config entry and the store.
- uv is used for the dev tooling only (`uv sync --locked`, `uv run …`); the integration itself has no Python requirements.

## Checks before a commit

```bash
uv run ruff check . && uv run ruff format --check .
uv run python scripts/check_versions.py
uv run pytest
cd frontend && npm run lint && npm run format:check && npm test && npm run build
```

## Git and releases

- Authorship: commits and PRs show only **Florian Barre** (`94544310+Florian-BARRE@users.noreply.github.com`), `commit.gpgsign false`. No Claude co-author trailer, session link or "Generated with" line.
- Work on `feature/…` branches; merge to `main` only after Flo has validated the real rendering.
- Releasing = bump the version in the three files + a CHANGELOG entry, merged on `main`. `auto-release.yml` then builds the panel, zips the integration folder and publishes `vX.Y.Z`.
