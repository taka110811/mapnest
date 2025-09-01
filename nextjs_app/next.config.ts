import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/tiles/:path*',
        destination: 'http://localhost:8080/tiles/:path*'
      }
    ];
  },
  
  async headers() {
    return [
      {
        source: '/tiles/:path*',
        headers: [
          { 
            key: 'Cache-Control', 
            value: 'public, max-age=31536000, immutable' 
          }
        ]
      }
    ];
  }
};

export default nextConfig;
