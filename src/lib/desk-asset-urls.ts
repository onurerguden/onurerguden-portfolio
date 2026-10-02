import type { Locale } from "./content";
import assets from "./desk-assets.json";

// Versioned URLs for the desk's assets, built only here. The images are WebPs
// our scripts encode at their final size, so next/image serves them
// unoptimized: no transcode on first view, and their ?v= revisions need no
// images.localPatterns entry for `next dev` to hold stale. Spread the image
// props into next/image so the src never travels without that flag.

/** The desk model, versioned with its rendered views. */
export const deskModelSrc = `/models/desk/onur-desk.glb?v=${assets.revision}`;

/** A rendered desk view or detail. */
export const deskImage = (name: string) =>
  ({
    src: `/images/desk/${name}.webp?v=${assets.revision}`,
    unoptimized: true,
  }) as const;

/** The final view, captured per language with its own revision. */
export const roomPoster = (locale: Locale) =>
  ({
    src: `/images/desk/room-poster-${locale}.webp?v=${assets.posters[locale]}`,
    unoptimized: true,
  }) as const;
