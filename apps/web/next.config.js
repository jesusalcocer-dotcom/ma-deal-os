/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@ma-deal-os/core',
    '@ma-deal-os/db',
    '@ma-deal-os/ai',
    '@ma-deal-os/integrations',
  ],
};

module.exports = nextConfig;
