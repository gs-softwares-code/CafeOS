import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import path from 'path';

if (process.env.NODE_ENV === 'development') {
  void initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '.'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
