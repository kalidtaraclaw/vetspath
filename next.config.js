/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.GITHUB_ACTIONS ? '/vetspath' : '',
  assetPrefix: process.env.GITHUB_ACTIONS ? '/vetspath/' : '',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    // pdfjs-dist requires canvas which isn't available in Node — mark as external for SSR
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
}

module.exports = nextConfig
