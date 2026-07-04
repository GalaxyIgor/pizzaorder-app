import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@pizzaorder/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
