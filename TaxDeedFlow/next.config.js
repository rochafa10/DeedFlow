let withPWA = (config) => config;
try {
  withPWA = require('next-pwa')({
    dest: 'public',
    disable: true,
    register: false,
    skipWaiting: true,
  });
} catch (e) {
  // next-pwa not installed, skip
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        pathname: '/maps/api/**',
      },
    ],
  },
}

module.exports = withPWA(nextConfig)
