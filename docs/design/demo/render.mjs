// ====== Code Summary ======
// Renders the panel preview (preview.html + snapshot.json) to PNG pictures:
//   node docs/design/demo/render.mjs [out-dir] [shot-name]
// Needs Playwright (`npm i -g playwright`, found through NODE_PATH) and a
// Chrome or Chromium; set CHROME to its path when Playwright has no browser of
// its own. Build the panel first (cd frontend && npm run build).

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const here = import.meta.dirname;
const root = path.resolve(here, "../../..");
const { chromium } = createRequire(import.meta.url)("playwright");

const snapshot = readFileSync(path.join(here, "snapshot.json"), "utf8");
// Modules do not load from file:// pages: the repository is served from a
// made-up origin instead, straight from the disk.
const ORIGIN = "http://vivid-pilot.preview";
const bundle = `${ORIGIN}/custom_components/vivid_pilot/frontend/vivid-pilot-panel.js`;
const outDir = path.resolve(
  process.argv[2] ?? path.join(root, "docs/assets/panel"),
);
const only = process.argv[3];

/** Each picture: the panel state to set, the theme and the viewport. */
const SHOTS = [
  { name: "panel-home", set: { tab: "tree", mode: "list", selected: "all" } },
  { name: "panel-room", set: { tab: "tree", mode: "list", selected: "salon" } },
  {
    name: "panel-room-dark",
    theme: "dark",
    set: { tab: "tree", mode: "list", selected: "salon" },
  },
  {
    name: "panel-graph",
    set: { tab: "tree", mode: "graph", selected: "salon" },
    height: 760,
  },
  {
    name: "panel-leaf",
    set: { tab: "tree", mode: "list", selected: "salon" },
    after: { editing: "light.salon_tv_leds" },
  },
  { name: "panel-memory", set: { tab: "memory" } },
  {
    name: "panel-memory-settings",
    set: { tab: "tree", mode: "list", selected: "salon" },
    after: { memoryNode: "salon" },
  },
  {
    name: "panel-power",
    set: { tab: "tree", mode: "list", selected: "salon__led" },
    height: 1100,
  },
  { name: "panel-utilities", set: { tab: "utilities" } },
];

/** Pieces of the dark panel cut out for the banner (docs/design/crops/, not committed). */
const CROPS = [
  {
    name: "hero",
    width: 1060,
    set: { tab: "tree", mode: "list", selected: "salon" },
    selector: "vivid-pilot-node .hero",
  },
  {
    name: "leds",
    set: { tab: "tree", mode: "list", selected: "salon" },
    selector: "vivid-pilot-node section.category >> nth=1",
  },
  {
    name: "tree",
    set: { tab: "tree", mode: "list", selected: "salon" },
    selector: "vivid-pilot-tree nav",
  },
  {
    name: "memory",
    width: 900,
    set: { tab: "memory" },
    selector: "vivid-pilot-memory-tab .list",
  },
];

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);
/** A page with the panel in the given state and theme. */
async function open(shot) {
  const page = await browser.newPage({
    viewport: { width: shot.width ?? 1360, height: shot.height ?? 860 },
    deviceScaleFactor: 2,
  });
  await page.addInitScript(
    ([data, src]) => {
      window.VP_SNAPSHOT = JSON.parse(data);
      window.VP_BUNDLE = src;
    },
    [snapshot, bundle],
  );
  page.on("pageerror", (error) =>
    console.error(`${shot.name}: ${error.message}`),
  );
  await page.route(`${ORIGIN}/**`, (route) => {
    const file = path.join(root, new URL(route.request().url()).pathname);
    const type = file.endsWith(".js") ? "text/javascript" : "text/html";
    return route.fulfill({ body: readFileSync(file), contentType: type });
  });
  await page.goto(`${ORIGIN}/docs/design/demo/preview.html`);
  await page.evaluate(
    (theme) => (document.body.className = theme),
    shot.theme ?? "light",
  );
  await page.waitForFunction(() => window.vpPanel?.payload);
  await page.evaluate(
    (state) => Object.assign(window.vpPanel, state),
    shot.set,
  );
  if (shot.after) {
    await page.waitForTimeout(200);
    await page.evaluate(
      (state) => Object.assign(window.vpPanel, state),
      shot.after,
    );
  }
  await page.waitForTimeout(400);
  return page;
}

for (const shot of SHOTS) {
  if (only && shot.name !== only) continue;
  const page = await open(shot);
  const file = path.join(outDir, `${shot.name}.png`);
  await page.screenshot({ path: file });
  console.info(file);
  await page.close();
}
for (const crop of CROPS) {
  if (only && only !== "crops") continue;
  const page = await open({ ...crop, theme: "dark" });
  const file = path.join(here, "../crops", `${crop.name}.png`);
  await page
    .locator(crop.selector)
    .screenshot({ path: file, omitBackground: true });
  console.info(file);
  await page.close();
}
// The README banner, laid out from the crops.
if (!only || only === "crops" || only === "banner") {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 640 },
    deviceScaleFactor: 2,
  });
  await page.goto(`file://${path.join(here, "../banner.html")}`);
  await page.waitForTimeout(500);
  const file = path.join(root, "docs/assets/banner.png");
  await page.screenshot({ path: file });
  console.info(file);
  await page.close();
}
await browser.close();
