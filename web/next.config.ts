import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server build for the Docker image (web/Dockerfile).
  output: "standalone",
  // The browser never talks to the engine: every engine call goes through a route handler that enforces the
  // caller's tier and quota (HLD section 3). ENGINE_URL is read at runtime by lib/server/config.ts.
  // Basic hardening (GDPR art. 32: appropriate security).
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      ],
    }];
  },
  poweredByHeader: false,
};

export default nextConfig;
