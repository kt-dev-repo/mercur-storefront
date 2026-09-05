# Mercur Storefront

The shopper-facing storefront for the marketplace in
[`kt-dev-repo/mercur`](https://github.com/kt-dev-repo/mercur). Next.js 15, React 19,
npm, deployed as its own Dokploy service.

Sourced from Mercur's `apps/storefront` (`@mercurjs/storefront@2.3.4-canary.3`).

## Why this is a separate repository

`@mercurjs/storefront` requires **React 19**. The marketplace repo pins React **18.3.1**
at its workspace root because the admin and vendor panels need it, and React 19 has
already broken that install once — the `resend` SDK was dropped for exactly this
peer-dependency conflict.

Keeping the storefront here removes the collision by construction rather than by
configuration, and leaves the marketplace `package.json` untouched.

## Quick start

```bash
cp .env.example .env.local   # then fill it in — see the contract below
npm install --force
npm run dev                  # http://localhost:3000
```

### Why npm, and why `--force`

npm, matching the marketplace repo — one package manager across both.

Every install needs `--force`. Every published `@medusajs/ui`, including the latest,
declares `peer react@^18.3.1`, and this app runs React 19, so a strict install fails with
`ERESOLVE`. There is no React 19-compatible release; upstream ships this combination and
pnpm and bun simply warn and proceed.

`--force`, and specifically **not** `--legacy-peer-deps`: the first installs peers but
tolerates a conflicting range, which reproduces what upstream actually builds against; the
second skips peer installation entirely and silently drops packages only reachable as
peers. The marketplace repo makes the same choice for the same reason.


The backend must be running and seeded. `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is not
optional: the store API refuses every request without it.

## The contract with the backend

The two repositories are joined by environment variables, not by code. Each row must
agree on both sides or the feature fails **quietly**.

| Here | In the marketplace repo | What breaks if they disagree |
|---|---|---|
| `MEDUSA_BACKEND_URL` | the API's public origin | Nothing loads |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | publishable key created by the seed | Every store API call is rejected |
| `NEXT_PUBLIC_BASE_URL` | `MERCUR_STOREFRONT_URL` | Customer password-reset emails link to the wrong host, or carry no link at all |
| `REVALIDATE_SECRET` | `STOREFRONT_REVALIDATE_SECRET` | The backend's revalidate hook is rejected and the storefront serves stale pages forever |
| — | `STOREFRONT_REVALIDATE_URL` | Must point at this deployment, or the hook reaches nothing |
| `NEXT_PUBLIC_VENDOR_URL` | `MERCUR_VENDOR_URL` | "Sell with us" links go nowhere useful |
| `NEXT_PUBLIC_STRIPE_KEY` | `STRIPE_API_KEY` is the **secret** counterpart | Checkout cannot mount Stripe elements |

> `NEXT_PUBLIC_STRIPE_KEY` is the **publishable** key (`pk_...`). The secret key
> (`sk_...`) belongs only in the backend. Anything `NEXT_PUBLIC_*` ships to the browser.

## Build-time versus runtime

**Every `NEXT_PUBLIC_*` is compiled into the bundle at build time.** Changing one requires
a rebuild; restarting the container keeps serving the old value and nothing reports the
mismatch. In `deploy/docker-compose.yml` they are therefore `build.args`, not
`environment`.

Only `MEDUSA_BACKEND_URL` and `REVALIDATE_SECRET` are read at runtime.

This is the same trap the marketplace repo documents for `MERCUR_BACKEND_URL`.

## Deploying

```bash
cd deploy
DOMAIN=shop.example.com docker compose up -d --build
```

Dokploy: point the service at `deploy/docker-compose.yml`, set the variables above, and
join the existing `dokploy-network` so Traefik can route it. Use a different `DOMAIN`
and `TRAEFIK_ROUTER` from the backend stack.

## Verifying

```bash
npm install --force
npm run build        # must pass — this is what the Dockerfile ships
npm run check-types  # currently reports 82 inherited errors; see below
npm run lint
```

## Known issues inherited from upstream

Left as-is on purpose so the app still matches its source and can be re-diffed on
upgrade. All four should be addressed before real traffic:

1. **`images.remotePatterns` ends with `hostname: '**'`** — the Next.js image optimizer
   will fetch and re-serve *any* remote URL, which is an open image proxy. Restrict it to
   your backend origin and CDN.
2. **`typescript: { ignoreBuildErrors: true }`** — type errors do not fail the build.
3. **`npm run check-types` reports 82 errors**, all from upstream's `src/`. That is the
   direct consequence of (2). Treat 82 as a baseline: it must not grow. New code should
   typecheck cleanly.
4. **`next build` runs ESLint, and upstream's source does not pass `next/typescript`.**
   `eslint.config.mjs` downgrades the rules it trips to warnings — around 210 of them —
   rather than rewriting upstream code, which would make every future re-diff painful.
   Do not add new violations.

### Fixed during extraction

Two things upstream's monorepo was hiding, both of which would have broken this
deployment:

- **No ESLint config.** Upstream's storefront inherits `eslint.config.mts` from the
  monorepo root. Standalone, `next build` failed on every `.ts` file with
  `Parsing error: The keyword 'export' is reserved`. `eslint.config.mjs` supplies
  `next/core-web-vitals` and `next/typescript`.
- **An undeclared dependency.** `embla-carousel` is imported directly but was never in
  `package.json`. It surfaced while this repo was briefly on pnpm, whose strict resolution
  refuses it; npm's hoisting hides it again, and `ignoreBuildErrors` meant the build never
  complained either way. Now declared, which is correct regardless of package manager.
- **`outputFileTracingRoot`.** Next traced the workspace root upwards and emitted the
  standalone server at `.next/standalone/Documents/github-clone/.../server.js`. The
  Dockerfile copies `.next/standalone` to `/app` and runs `node server.js`, so the image
  would have contained no server at all.

## Upgrading

This tracks `@mercurjs/storefront`, currently a **canary** release
(`2.3.4-canary.3`; npm `latest` is `2.3.3`). When 2.3.4 ships stable, bump
`@mercurjs/client` and `@mercurjs/types` together and re-diff against upstream:

```bash
git clone --depth 1 https://github.com/mercurjs/mercur.git /tmp/mercur-upstream
diff -ru /tmp/mercur-upstream/apps/storefront/src ./src | less
```
