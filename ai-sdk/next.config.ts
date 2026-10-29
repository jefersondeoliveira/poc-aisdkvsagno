import type { NextConfig } from "next";

// Shared provider config lives in poc/.env (one level above this app).
try {
  process.loadEnvFile("../.env");
} catch {}

const nextConfig: NextConfig = {};

export default nextConfig;
