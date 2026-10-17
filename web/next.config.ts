import type { NextConfig } from "next";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Proxy /engine/* to the Spring Boot engine so the browser never deals with CORS.
  async rewrites() {
    return [{ source: "/engine/:path*", destination: `${ENGINE_URL}/api/:path*` }];
  },
};

export default nextConfig;
