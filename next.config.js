/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Add support for importing from shared directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, './shared'),
    };

    return config;
  },
}

module.exports = nextConfig;
