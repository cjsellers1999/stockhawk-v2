import tailwind from "eslint-plugin-tailwindcss";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const tailwindRules = Object.fromEntries(
  Object.keys(tailwind.rules).map((ruleName) => [
    `tailwindcss/${ruleName}`,
    "error",
  ]),
);

export default defineConfig([
  {
    ignores: ["**/dist/**", "**/coverage/**", ".scratch/**", "node_modules/**"],
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: "./apps/web/tsconfig.app.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { tailwindcss: tailwind },
    settings: {
      tailwindcss: {
        cssConfigPath: "./src/styles.css",
      },
    },
    rules: {
      ...tailwindRules,
    },
  },
  {
    files: ["apps/web/src/lib/cn.ts"],
    rules: Object.fromEntries(
      Object.keys(tailwind.rules).map((ruleName) => [
        `tailwindcss/${ruleName}`,
        "off",
      ]),
    ),
  },
]);
