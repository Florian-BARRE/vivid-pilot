// ====== Code Summary ======
// ESLint flat config for the panel sources (TypeScript, recommended rules).

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: ["node_modules"],
});
