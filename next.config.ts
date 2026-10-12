import type { NextConfig } from "next";

// Default config for web development (standalone server build)
// For mobile/APK builds, the build:mobile script overrides this with output: "export"
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Disable image optimization for static export compatibility
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
