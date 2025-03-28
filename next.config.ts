import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Add support for importing from shared directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, './shared'),
    };

    return config;
  },
};

export default nextConfig;
