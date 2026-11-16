# Contributing

Issues and pull requests are welcome. The conventions of the repository are in
[AGENTS.md](AGENTS.md), the design in [docs/architecture.md](docs/architecture.md).

## Setup

```bash
uv sync --locked              # Python tools and Home Assistant's test harness
cd frontend && npm ci         # the panel
```

## Layout

| Path                            | Role                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| `custom_components/vivid_pilot/` | The integration (what the Marketplace installs)            |
| `frontend/`                     | The sidebar panel (Lit + TypeScript + Vite)                 |
| `tests/`                        | pytest with `pytest-homeassistant-custom-component`         |
| `docs/`                         | The documentation; `docs/design/` makes its pictures        |

## Before a pull request

```bash
uv run ruff check . && uv run ruff format --check .
uv run python scripts/check_versions.py
uv run pytest
cd frontend && npm run lint && npm run format:check && npm test && npm run build
```

The CI runs the same checks, plus hassfest and the HACS validation.

## Releases

Bump the version in `manifest.json`, `pyproject.toml` and
`frontend/package.json`, add a CHANGELOG entry, and merge on `main`: the
release (`vX.Y.Z`, with the zipped integration) is published automatically.

## Pictures

The screenshots and headers of the documentation come from the real panel on a
demo home: see [docs/design/README.md](docs/design/README.md).
