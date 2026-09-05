---
name: storefront
description: Work on the Mercur storefront — Next.js App Router pages, components, data fetching, or its deployment. Use before changing anything here, and especially before touching environment variables, which are shared with the marketplace backend and fail silently when they disagree.
---

# Storefront

Next.js 15 App Router, React 19, Tailwind, npm. Sourced from Mercur's
`apps/storefront` at `@mercurjs/storefront@2.3.4-canary.3`.

## The two things that fail silently

**1. `NEXT_PUBLIC_*` is baked in at build time.** Not read at runtime. Changing one and
restarting keeps serving the old value, and nothing reports it. In
`deploy/docker-compose.yml` they are `build.args` for that reason. Only
`MEDUSA_BACKEND_URL` and `REVALIDATE_SECRET` are runtime values.

**2. The contract with the backend is by environment variable, not code.** Both repos must
agree, and when they do not the failure is quiet:

| Here | Marketplace repo | Silent failure |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | `MERCUR_STOREFRONT_URL` | Password-reset emails link to the wrong host |
| `REVALIDATE_SECRET` | `STOREFRONT_REVALIDATE_SECRET` | Revalidate hook rejected; stale pages forever |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | seeded publishable key | Every store API call rejected |
| `NEXT_PUBLIC_STRIPE_KEY` | `STRIPE_API_KEY` (the **secret** twin) | Checkout cannot mount Stripe |

Changing one side means changing the other in the same breath.

## Rules

1. **npm, and every install needs `--force`.** Every published `@medusajs/ui` declares
   `peer react@^18.3.1` while this app runs React 19, so a strict install fails with
   `ERESOLVE`. Never `--legacy-peer-deps`: it skips peer installation rather than
   tolerating the range.
2. **Never put a secret in a `NEXT_PUBLIC_*`.** It ships to the browser. Stripe's
   publishable key belongs here; the secret key belongs only in the backend.
3. **React 19 stays isolated here.** This repository exists because the panels are pinned
   to React 18.3.1.
4. **`npm run build` passing does not mean the types are sound.** `next.config.ts` sets
   `typescript.ignoreBuildErrors: true`, inherited from upstream. Run `npm run check-types`.

## Known issues inherited from upstream

- `images.remotePatterns` ends with `hostname: '**'`, making the image optimizer an open
  proxy for arbitrary remote URLs. Restrict it to the backend origin and CDN before real
  traffic.
- `typescript.ignoreBuildErrors: true`, so the build does not fail on type errors.
- **`npm run check-types` reports 82 errors**, all in upstream's `src/` — the direct
  consequence of the above. That number is a **baseline that must not grow**.
- `next build` emits ~210 ESLint warnings from inherited code. `eslint.config.mjs`
  downgrades the tripped rules to warnings rather than rewriting upstream source, which
  would make every future re-diff painful. **Do not add new violations** — if a
  downgraded rule is the only thing your change trips, fix the code instead.

These are deliberately unchanged so the app still matches its source; fix them
deliberately, and say so when you do.

## Three things the monorepo was hiding

Fixed during extraction, and worth knowing if you re-extract from a newer upstream:

1. **No ESLint config** — upstream inherits it from the monorepo root. Standalone, every
   `.ts` file failed with `Parsing error: The keyword 'export' is reserved`.
2. **An undeclared dependency** — `embla-carousel` is imported directly but was not in
   `package.json`. Found while briefly on pnpm, whose strict resolution refuses it; npm
   hides it again, so it stays declared deliberately.
3. **`outputFileTracingRoot`** — Next traced upwards and emitted `server.js` at
   `.next/standalone/<abs/path>/server.js`, so the Docker image would have shipped with
   no server.

## Upgrading

Currently on a **canary** (`2.3.4-canary.3`; npm `latest` is `2.3.3`). Bump
`@mercurjs/client` and `@mercurjs/types` together, then diff against upstream:

```bash
git clone --depth 1 https://github.com/mercurjs/mercur.git /tmp/mercur-upstream
diff -ru /tmp/mercur-upstream/apps/storefront/src ./src
```
