import type { NextConfig } from "next";
import deskAssets from "./src/lib/desk-assets.json";

const nextConfig: NextConfig = {
  images: {
    // Exact queries only, so the optimizer cannot be asked for arbitrary
    // variants. Desk image URLs come from src/lib/desk-asset-urls.ts.
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/images/desk/**", search: `?v=${deskAssets.revision}` },
      {
        pathname: "/images/desk/room-poster-*.webp",
        search: `?v=${deskAssets.posterRevision}`,
      },
    ],
  },
};

export default nextConfig;
