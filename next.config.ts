import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize images from external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
};

export default nextConfig;
