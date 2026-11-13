// ====== Code Summary ======
// Builds the panel into one ES module, written straight into the integration
// folder so Home Assistant serves it (custom_components/vivid_pilot/frontend).

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const OUT_DIR = fileURLToPath(
  new URL("../custom_components/vivid_pilot/frontend", import.meta.url),
);

export default defineConfig({
  build: {
    outDir: OUT_DIR,
    emptyOutDir: false,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "vivid-pilot-panel.js",
    },
  },
});
