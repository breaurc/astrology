import type { NextConfig } from "next";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Self-contained server build for the Docker image (web/Dockerfile).
  output: "standalone",
  // Proxy /engine/* to the Spring Boot engine so the browser never deals with CORS.
  async rewrites() {
    return [{ source: "/engine/:path*", destination: `${ENGINE_URL}/api/:path*` }];
  },
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
