import assets from "./desk-assets.json";

// Versioned URLs for the desk's images. next.config.ts allows exactly these
// queries for next/image, so every desk image src is built here.

/** A rendered desk view or detail, versioned with the model. */
export const deskImageSrc = (name: string) =>
  `/images/desk/${name}.webp?v=${assets.revision}`;

/** The final view, captured per language, versioned with its own capture. */
export const roomPosterSrc = (locale: "en" | "tr") =>
  `/images/desk/room-poster-${locale}.webp?v=${assets.posterRevision}`;
