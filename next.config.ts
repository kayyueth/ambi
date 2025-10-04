import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "tesseract.js"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("pdf-parse", "tesseract.js");
    }
    return config;
  },
  // Optimize for deployment
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js"],
  },
  // Ensure proper handling of large files
  serverActions: {
    bodySizeLimit: "10mb",
  },
};

export default nextConfig;
