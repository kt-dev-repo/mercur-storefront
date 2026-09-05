# Mercur Storefront

The shopper-facing storefront for the marketplace in `kt-dev-repo/mercur`. Next.js 15 App
Router, React 19, Tailwind, pnpm. Sourced from Mercur's `apps/storefront`.

**Read `README.md` first** — the contract with the backend and the build-time/runtime
distinction are the two things that cause silent failures here.

## Hard rules

1. **pnpm, not npm.** `packageManager` declares it and the Dockerfile uses
   `--frozen-lockfile`. The marketplace repo is on npm for a Medusa-specific reason that
   does not apply here; do not "unify" them.
2. **React 19 stays here.** This app exists as a separate repository *because* it needs
   React 19 and the marketplace panels need 18.3.1. Never merge the two installs.
3. **Anything `NEXT_PUBLIC_*` ships to the browser and is baked in at build time.** Never
   put a secret in one. Changing one needs a rebuild, not a restart.
4. **Do not break the contract silently.** Renaming or dropping any variable in the
   README's contract table means changing the marketplace repo in the same breath, or a
   feature there fails quietly — password-reset links and cache revalidation both depend
   on it.

## Structure

```
src/
├── app/          # Next.js App Router routes
├── components/   # atoms / cells / organisms / sections
├── lib/          # data fetching and helpers
└── types/
deploy/           # Dockerfile + Dokploy compose service
```

`@/*` maps to `./src/*`. There are no path aliases outside this directory — the app is
self-contained.

## Verifying a change

```bash
pnpm install
pnpm check-types      # tsc --noEmit; the Next build does NOT fail on type errors
pnpm lint
pnpm build            # output: "standalone" — this is what the Dockerfile ships
```

`next.config.ts` sets `typescript.ignoreBuildErrors: true` (inherited from upstream), so
`pnpm build` passing does **not** mean the types are sound.

`pnpm check-types` currently reports **82 errors, all in upstream's `src/`**. Treat that
number as a baseline that must not grow — new code should typecheck cleanly. Likewise
`next build` emits ~210 ESLint warnings from inherited code; `eslint.config.mjs`
downgrades those rules rather than rewriting upstream source. Do not add new violations.

Against a running backend, confirm end to end: the seeded catalogue renders, a product
page loads, a two-seller cart reaches checkout, and publishing a product in the admin
panel triggers the revalidate hook.
