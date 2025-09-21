import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "tesseract.js"],
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
