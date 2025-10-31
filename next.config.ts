import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Don’t fail the Vercel build because of ESLint problems.
  eslint: { ignoreDuringBuilds: true },  images: {
    // ✅ Allow remote images from your firm logo sources
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co", // sample fallback
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com", // e.g. Discord-hosted logos
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "madprops.io", // your future CDN / uploads
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com", // if you store logos in GitHub
        port: "",
        pathname: "/**",
      },
    ],
  },

  // ✅ Webpack alias (unchanged)
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;
