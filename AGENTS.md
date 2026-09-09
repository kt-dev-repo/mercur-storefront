# Mercur Storefront

The shopper-facing storefront for the marketplace in `kt-dev-repo/mercur`. Next.js 15 App
Router, React 19, Tailwind, npm. Sourced from Mercur's `apps/storefront`.

**Read `README.md` first** — the contract with the backend and the build-time/runtime
distinction are the two things that cause silent failures here.

## Hard rules

1. **npm, with `--force` on every install.** Every published `@medusajs/ui` declares
   `peer react@^18.3.1` and this app runs React 19, so a strict install fails with
   `ERESOLVE`. Never `--legacy-peer-deps` — it skips peer installation entirely rather
   than tolerating the range. Same choice, same reasoning, as the marketplace repo.
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
npm install --force
npm run check-types      # tsc --noEmit — must be clean
npm run lint
npm run build            # output: "standalone" — this is what the Dockerfile ships
./deploy/verify-compose.sh   # static checks on the deploy stack; no container needed
```

CI runs all four on every push (`.github/workflows/ci.yml`).

**`check-types` must report zero.** It reported 82 for a while, because
`next.config.ts` set `typescript.ignoreBuildErrors: true` and the build never complained.
Both are fixed: the errors are gone and `ignoreBuildErrors` is `false`, so `npm run build`
now fails on a type error too.

`next build` still emits ~210 ESLint warnings from inherited code; `eslint.config.mjs`
downgrades those rules rather than rewriting upstream source. Do not add new violations.

**`sdk` gives no path typing.** `src/lib/client.ts` cannot use the generated route map —
it resolves half its routes through `@mercurjs/core`, a server framework deliberately not
a dependency here — so the client is declared navigable and every call returns `unknown`.
Type the RESPONSE at the call site with `apiResponse<T>()` in `lib/data`, using
`HttpTypes` (@medusajs/types) or `@mercurjs/types/http`. A mistyped path is not caught by
the compiler; a mistyped response is.

Against a running backend, confirm end to end: the seeded catalogue renders, a product
page loads, a two-seller cart reaches checkout, and publishing a product in the admin
panel triggers the revalidate hook.
