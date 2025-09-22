/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    PURELYMAIL_API_KEY: process.env.PURELYMAIL_API_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/purelymail/:path*',
        destination: 'https://purelymail.com/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;