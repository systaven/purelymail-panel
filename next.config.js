/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // The Dockerfile sets NEXT_OUTPUT=standalone to build a self-contained server.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
};

module.exports = nextConfig;
