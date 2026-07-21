import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.vite/**",
      "backend/src/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Leading-underscore convention marks an intentionally-unused
      // parameter (e.g. Express error middleware's required 4-arg
      // signature) rather than a mistake.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Warn, not error: some Prisma/Express edge cases legitimately need
      // an escape hatch during Phase 3. See specs/FLO-005-lint-format-precommit.md.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["frontend/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat["recommended-latest"],
  },
  {
    files: ["frontend/**/*.{ts,tsx}"],
    ...reactRefresh.configs.vite,
  },
  // Atomic Design dependency direction: atoms -> molecules -> organisms ->
  // templates -> pages, never sideways or down. See
  // specs/FLO-009-design-system-foundation.md.
  {
    files: ["frontend/src/components/atoms/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/molecules/**", "**/organisms/**", "**/templates/**"],
              message: "Atoms may not import from molecules/organisms/templates.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["frontend/src/components/molecules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/organisms/**", "**/templates/**"],
              message: "Molecules may not import from organisms/templates.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["frontend/src/components/organisms/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/templates/**"],
              message: "Organisms may not import from templates.",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
