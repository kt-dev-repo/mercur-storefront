import type { NextConfig } from 'next';

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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'medusa-public-images.s3.eu-west-1.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: 'mercur-connect.s3.eu-central-1.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: 'api.mercurjs.com'
      },
      {
        protocol: 'http',
        hostname: 'localhost'
      },
      {
        protocol: 'https',
        hostname: 'api-sandbox.mercurjs.com',
        pathname: '/static/**'
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com'
      },
      {
        protocol: 'https',
        hostname: 's3.eu-central-1.amazonaws.com'
      },
      {
        protocol: "https",
        hostname: "mercur-testing.up.railway.app",
      },
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },
  typescript: {
    // The build does not fail on type errors, and there are currently 82 of them —
    // almost all one root cause, the Medusa SDK's responses resolving as `{}` so every
    // `.products` / `.carts` / `.regions` access is an error. This flag is why none of
    // that is visible from `npm run build`, and why the count grew unnoticed.
    //
    // Do not remove it without fixing those first: the build would stop dead. The CI
    // `typecheck-ratchet` job is the interim guard — it fails if the count RISES, so the
    // debt cannot get worse by accident while it is being paid down.
    ignoreBuildErrors: true
  }
};

export default nextConfig;
