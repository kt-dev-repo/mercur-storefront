// Standalone ESLint config.
//
// Upstream's storefront has no config of its own — it inherits `eslint.config.mts` from
// the Mercur monorepo root. Extracted into its own repository the app had no TypeScript
// parser at all, and `next build` failed on every .ts file with
// "Parsing error: The keyword 'export' is reserved".
//
// `next/typescript` is what supplies the parser; `next/core-web-vitals` is Next's own
// rule set. FlatCompat bridges them into ESLint 9's flat config format.
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

export default [
  {
    ignores: [".next/**", "node_modules/**", "public/**", "storybook-static/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // The code in src/ is upstream's, and it does not pass `next/typescript` cleanly —
    // mostly `any` in helpers and API types. These stay ON so the problems are reported,
    // but as warnings rather than errors, because `next build` runs lint and would
    // otherwise fail on inherited code.
    //
    // Fixing them in place would create a large diff against upstream and make every
    // future re-diff painful (see "Upgrading" in README.md). Do not add NEW violations:
    // if a rule below is the only thing your change trips, fix the code instead.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      // Genuinely unsafe (`a?.b!` defeats the optional chain), and genuinely upstream's.
      // Worth fixing there rather than diverging here.
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
];
