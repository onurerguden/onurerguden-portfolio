import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getProjects, locales, validateContent } from "../src/lib/content";
import {
  getCertificates,
  readTechStack,
  validateHomeContent,
} from "../src/lib/home-content";
import techIcons from "../src/lib/tech-icons.generated.json";

async function main() {
  validateContent();
  validateHomeContent();

  // Every image the content references exists at the declared size.
  const images = new Map<string, { width: number; height: number }>();
  for (const locale of locales) {
    for (const project of getProjects(locale))
      for (const item of project.media ?? []) images.set(item.src, item);
    for (const certificate of getCertificates(locale))
      images.set(certificate.image.src, certificate.image);
  }
  for (const [src, expected] of images) {
    const file = path.join(process.cwd(), "public", src);
    if (!fs.existsSync(file)) throw new Error(`Missing content image: ${src}`);
    const { width, height } = await sharp(file).metadata();
    if (width !== expected.width || height !== expected.height)
      throw new Error(
        `Content image size differs: ${src} is ${width}×${height}, declared ${expected.width}×${expected.height}`,
      );
  }

  // The generated icon file matches the technology list exactly.
  const wanted = readTechStack()
    .items.flatMap((item) =>
      "simpleIcons" in item.icon ? [item.icon.simpleIcons] : [],
    )
    .sort()
    .join();
  if (Object.keys(techIcons.icons).sort().join() !== wanted)
    throw new Error(
      "Technology icons are stale: run node scripts/tech/build-icons.mjs",
    );

  console.log(
    `English/Turkish content, shared facts, home sections and ${images.size} images validated.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
