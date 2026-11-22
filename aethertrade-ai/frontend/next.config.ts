import path from "node:path";

import type { NextConfig } from "next";

/**
 * The browser only ever talks to this origin. /api/v1/* is rewritten to the FastAPI backend so session
 * cookies stay first-party and no CORS configuration is needed.
 *
 * Note: rewrites are resolved at build time for `output: "standalone"`, so AETHER_BACKEND_URL must be set
 * when running `next build` (the Dockerfile passes it as a build argument).
 */
const backendUrl = (process.env.AETHER_BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");
const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev mode additionally needs eval for fast refresh.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the workspace root: the repository root has an unrelated package-lock.json (the poster app),
  // which would otherwise make Next.js trace files from the wrong directory.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
