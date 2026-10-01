import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep the Admin SDK as a Node dependency instead of bundling it.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
