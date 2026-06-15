import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Set to workspace root so standalone traces node_modules from the monorepo
  outputFileTracingRoot: path.join(__dirname, '../'),
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  transpilePackages: [
    '@lozzalingo/analytics',
    '@lozzalingo/auth',
    '@lozzalingo/config',
    '@lozzalingo/email',
    '@lozzalingo/events-ui',
    '@lozzalingo/booking-form',
    '@lozzalingo/logging',
    '@lozzalingo/merchandise',
    '@lozzalingo/ops',
    '@lozzalingo/orders',
    '@lozzalingo/settings',
    '@lozzalingo/storage',
    '@lozzalingo/subscribers',
  ],
  eslint: {
    // Ignore ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type checking during production builds (can fix types later)
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/server/images/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com',
      },
    ],
  },
};

export default nextConfig;
