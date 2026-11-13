# Design sources

The README pictures are the real panel, built from the sources, running on a
demo home that belongs to nobody.

1. `uv run pytest docs/design/demo/build_snapshot.py -p no:cacheprovider -o pythonpath=.`
   loads Vivid Pilot on the home described in `demo/home.json` and writes what
   the panel receives to `demo/snapshot.json`.
2. `cd frontend && npm run build`.
3. `node docs/design/demo/render.mjs` (Playwright through `NODE_PATH`, and
   `CHROME=/path/to/chrome` when Playwright has no browser of its own) mounts
   the panel in `demo/preview.html` on the snapshot and writes:
   - `docs/assets/panel/*.png`, the screenshots of the README;
   - `docs/design/crops/*.png` (not committed), pieces of the dark panel;
   - `docs/assets/banner.png`, `banner.html` laid out from those pieces.

`node docs/design/demo/render.mjs <out-dir> <shot>` renders a single picture,
`crops` the crops and the banner, `banner` the banner alone.
