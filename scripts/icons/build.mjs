// Renders the raster icons from public/icon.svg: favicon.ico for browsers and
// crawlers that ask for it, the Apple touch icon and the manifest icons.
// The touch and maskable icons are full-bleed squares: iOS and Android cut
// their own shape, so rounded corners would show as dark slivers.
// node scripts/icons/build.mjs
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("public/icon.svg", "utf8");
const square = svg.replace(/ rx="[^"]*"/, "");
// Android may cut the maskable icon to a circle 80% wide: the monogram shrinks
// into it while the background stays full bleed.
const maskable = square.replace(
  /(<\/rect>|<rect[^>]*\/>)([\s\S]*)<\/svg>/,
  '$1<g transform="translate(32 32) scale(.78) translate(-32 -32)">$2</g></svg>',
);

const png = (source, size, { opaque = false } = {}) => {
  const image = sharp(Buffer.from(source), {
    density: (72 * size) / 64,
  }).resize(size, size);
  // iOS paints transparent pixels black; the full-bleed icons have none.
  return (opaque ? image.removeAlpha() : image)
    .png({ compressionLevel: 9 })
    .toBuffer();
};

/** An ICO file holding PNG images (supported everywhere since Windows Vista). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

const favicon = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await png(svg, size) })),
);
await writeFile("public/favicon.ico", ico(favicon));
await writeFile(
  "public/apple-touch-icon.png",
  await png(square, 180, { opaque: true }),
);
await writeFile("public/icon-192.png", await png(svg, 192));
await writeFile("public/icon-512.png", await png(svg, 512));
await writeFile(
  "public/icon-maskable-512.png",
  await png(maskable, 512, { opaque: true }),
);
console.log(
  "Wrote favicon.ico, apple-touch-icon.png and three manifest icons.",
);
