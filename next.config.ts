import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local images without a query string only, so the optimizer cannot be
    // asked for arbitrary variants. Versioned desk images skip the optimizer
    // (src/lib/desk-asset-urls.ts).
    localPatterns: [{ pathname: "/**", search: "" }],
  },
};

export default nextConfig;
