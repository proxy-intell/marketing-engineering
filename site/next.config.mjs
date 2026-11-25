/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // The worker sent no x-powered-by.
  poweredByHeader: false,
};

export default nextConfig;
