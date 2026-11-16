// ====== Code Summary ======
// Renders the header picture of every documentation page listed in
// docs/design/headers.json to docs/assets/headers/<name>.jpg (2000 px wide), from
// page-header.html. The same script and template live in Vivid Cards and
// Vivid Pilot, so both documentations look alike.
//   node docs/design/render-headers.mjs [name]
//   node docs/design/render-headers.mjs --ecosystem   (docs/assets/ecosystem.png,
//     from ecosystem.html: needs vivid-cards/ and vivid-pilot/ side by side)
// Needs Playwright (found through NODE_PATH); CHROME=/path/to/chrome when
// Playwright has no browser of its own.

import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const here = import.meta.dirname;
const root = path.resolve(here, "../..");
const { chromium } = createRequire(import.meta.url)("playwright");
const manifest = JSON.parse(readFileSync(path.join(here, "headers.json"), "utf8"));
const only = process.argv[2];
const outDir = path.join(root, "docs/assets/headers");
mkdirSync(outDir, { recursive: true });

/** A path of the manifest (relative to the repository) as a file URL. */
const url = (file) => `file://${path.resolve(root, file)}`;

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);
if (only === "--ecosystem") {
  const tab = await browser.newPage({ viewport: { width: 1280, height: 560 }, deviceScaleFactor: 2 });
  await tab.goto(url("docs/design/ecosystem.html"));
  await tab.waitForLoadState("networkidle");
  await tab.waitForTimeout(200);
  const file = path.join(root, "docs/assets/ecosystem.png");
  await tab.screenshot({ path: file });
  console.info(file);
  await browser.close();
  process.exit(0);
}
for (const page of manifest.pages) {
  if (only && page.name !== only) continue;
  const tab = await browser.newPage({ viewport: { width: 1280, height: 400 }, deviceScaleFactor: 2000 / 1280 });
  await tab.addInitScript((header) => (window.HEADER = header), {
    product: manifest.product,
    logo: url(manifest.logo),
    kicker: page.kicker ?? manifest.kicker,
    title: page.title,
    text: page.text,
    accent: page.accent ?? "#8a3ffc",
    images: page.images.map(url),
  });
  await tab.goto(url("docs/design/page-header.html"));
  await tab.waitForLoadState("networkidle");
  await tab.waitForTimeout(150);
  // JPEG: a page header is a photo-like picture, a quarter of the PNG's weight.
  const file = path.join(outDir, `${page.name}.jpg`);
  await tab.screenshot({ path: file, type: "jpeg", quality: 86 });
  console.info(file);
  await tab.close();
}
await browser.close();
