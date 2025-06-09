/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['undici']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('undici');
    }
    return config;
  },
};

module.exports = nextConfig; 