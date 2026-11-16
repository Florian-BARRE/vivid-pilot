# Design sources

Every picture of this documentation is the real panel, built from the sources,
running on a demo home that belongs to nobody. The page headers and the
"Vivid Pilot + Vivid Cards" picture use the same templates as
[Vivid Cards](https://github.com/Florian-BARRE/vivid-cards/tree/main/docs/design),
so both documentations look alike.

Needs Playwright (`npm i -g playwright`, found through `NODE_PATH`) and a Chrome
or Chromium (`CHROME=/path/to/chrome` when Playwright has no browser of its own).

1. **Demo home**: `uv run pytest docs/design/demo/build_snapshot.py -p no:cacheprovider -o pythonpath=.`
   loads Vivid Pilot on the home of `demo/home.json` and writes what the panel
   receives to `demo/snapshot.json`.
2. **Panel**: `cd frontend && npm run build`.
3. **Screenshots**: `node docs/design/demo/render.mjs` mounts the panel
   (`demo/preview.html`) on the snapshot and writes `docs/assets/panel/*.png`,
   the dark crops `docs/design/crops/*.png` (not committed) and the banner
   (`banner.html` → `docs/assets/banner.png`).
   `render.mjs <out-dir> <shot>` renders one picture, `crops` the crops and the
   banner, `banner` the banner alone.
4. **Page headers**: `node docs/design/render-headers.mjs` renders every page of
   `headers.json` with `page-header.html` to `docs/assets/headers/*.jpg`
   (`render-headers.mjs <name>` for one).
5. **Vivid Pilot + Vivid Cards**: with `vivid-cards/` next to `vivid-pilot/`,
   both with their crops, `node docs/design/render-headers.mjs --ecosystem`
   renders `ecosystem.html` to `docs/assets/ecosystem.png` (the same picture in
   both repositories).
