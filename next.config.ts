import type { NextConfig } from "next";
import deskAssets from "./src/lib/desk-assets.json";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/images/desk/**", search: `?v=${deskAssets.revision}` },
    ],
  },
};

export default nextConfig;
