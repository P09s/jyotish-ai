import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all routes and assets to bypass the ngrok warning
        source: "/(.*)",
        headers: [
          {
            key: "ngrok-skip-browser-warning",
            value: "true",
          },
        ],
      },
    ];
  },
  // ... any other config options you already had in there
};

export default nextConfig;