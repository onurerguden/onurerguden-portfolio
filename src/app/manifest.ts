import type { MetadataRoute } from "next";

/**
 * Name, colours and icons for a home-screen shortcut. The site stays a page
 * in the browser (`display: browser`), so nothing prompts for an install.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Onur Ergüden — AI Engineer",
    short_name: "Onur Ergüden",
    description:
      "AI engineering, applied machine learning and research by Onur Ergüden.",
    start_url: "/",
    display: "browser",
    background_color: "#080e1c",
    theme_color: "#080e1c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
