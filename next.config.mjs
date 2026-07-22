import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://api.stripe.com https://*.digitaloceanspaces.com wss: ws:",
              "frame-src 'self' https://js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
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
    '@lozzalingo/calendar',
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
    // Lint is enforced in CI before build. Skip during Next.js build to avoid
    // double-checking and blocking on warnings from shared packages.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type checking is enforced in CI (filtered to FBQ source only).
    // Shared packages have upstream errors that would block next build.
    // Remove this once packages/events-ui errors are fixed upstream.
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
