import type { NextConfig } from 'next';

/**
 * Hostnames taken from the environment, so a deployment's own image host does not have
 * to be hard-coded here. Anything unparseable is dropped rather than throwing — a bad
 * URL must not stop the build, it should just not widen what the optimiser will fetch.
 */
const imageHostsFromEnv = Array.from(new Set(
  [
    process.env.MEDUSA_BACKEND_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    // Set this to the public origin of your object store when FILE_STORAGE=s3,
    // e.g. https://rustfs.example.com
    process.env.NEXT_PUBLIC_IMAGE_HOST,
  ].flatMap((value) => {
    if (!value) return [];
    try { return [new URL(value).hostname]; } catch { return []; }
  })
));

const nextConfig: NextConfig = {
  output: "standalone",
  // Without this, Next traces the workspace root upwards and emits the standalone
  // server at .next/standalone/<absolute/path/from/that/root>/server.js — here it
  // landed under .next/standalone/Documents/github-clone/... The Dockerfile copies
  // .next/standalone to /app and runs `node server.js`, so it would have shipped an
  // image with no server in it. Pinning the root keeps the output flat.
  outputFileTracingRoot: process.cwd(),
  trailingSlash: false,
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true
    }
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Hosts the image optimiser is allowed to fetch from.
    //
    // This list used to end in `{ protocol: 'https', hostname: '**' }`, which let the
    // optimiser fetch and re-serve ANY https URL — an open image proxy running on your
    // bandwidth, and a way to make your server issue arbitrary outbound requests.
    //
    // Removing the wildcard means the hosts you actually use must be named. Your own
    // product images are NOT a fixed host — they come from the backend, whose origin
    // differs per deployment — so those are derived from the environment below rather
    // than hard-coded.
    remotePatterns: [
      // Demo catalogue. The backend seed builds image URLs on these three, so dropping
      // them leaves every seeded product with a broken image.
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },

      // Referenced from this codebase, and upstream's sandbox data.
      { protocol: 'https', hostname: 'medusa-public-images.s3.eu-west-1.amazonaws.com' },
      { protocol: 'https', hostname: 'mercur-connect.s3.eu-central-1.amazonaws.com' },
      { protocol: 'https', hostname: 's3.eu-central-1.amazonaws.com' },
      { protocol: 'https', hostname: 'api.mercurjs.com' },
      { protocol: 'https', hostname: 'api-sandbox.mercurjs.com', pathname: '/static/**' },
      { protocol: 'https', hostname: 'i.imgur.com' },

      // Local development.
      { protocol: 'http', hostname: 'localhost' },

      // This deployment's own hosts, read at BUILD time from the environment: the
      // backend that serves /static uploads, this storefront, and — when FILE_STORAGE=s3
      // — the object store named by NEXT_PUBLIC_IMAGE_HOST. Both schemes are allowed
      // because a backend may legitimately be http behind a proxy.
      ...imageHostsFromEnv.flatMap((hostname) => [
        { protocol: 'https' as const, hostname },
        { protocol: 'http' as const, hostname },
      ]),
    ]
  },
  typescript: {
    // Was `ignoreBuildErrors: true`, which is how 82 type errors accumulated without
    // ever failing a build. The count is now zero, so the build enforces it again and
    // the debt cannot silently return.
    ignoreBuildErrors: false
  }
};

export default nextConfig;
