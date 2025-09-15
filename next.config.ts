import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "tesseract.js"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("pdf-parse", "tesseract.js");
    }
    return config;
  },
};

export default nextConfig;
