import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable SWC for ARM compatibility (Raspberry Pi)
  experimental: {
    forceSwcTransforms: false,
  },
  // Use Babel instead of SWC
  compiler: undefined,
};

export default nextConfig;
