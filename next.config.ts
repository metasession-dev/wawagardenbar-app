import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Optimize for Docker deployment
  images: {
    formats: ['image/webp'],
    remotePatterns: [],
  },
  serverExternalPackages: ['xlsx'],
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;
