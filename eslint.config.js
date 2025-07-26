import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";
import barrelFiles from "eslint-plugin-barrel-files"
import * as moduleReplacements from "eslint-plugin-depend"

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      moduleReplacements.configs['flat/recommended']
    ],
    plugins: {moduleReplacements},
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
