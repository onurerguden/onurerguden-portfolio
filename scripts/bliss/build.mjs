// Builds the Bliss parallax layers from the original photograph.
//
// Bliss is Microsoft's photograph by Charles O'Rear, used here with a visible
// credit at Onur's request (see docs/bliss.md). Nothing is redrawn: the
// photo's own pixels are split along the hill crest and the furrow in front of
// it. At rest the three layers recompose the original exactly; they only
// separate while the section scrolls. The raw source is downloaded into the
// ignored work/ directory and verified, and only derived web files are
// committed.
//
//   node scripts/bliss/build.mjs
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const SOURCE = {
  url: "https://archive.org/download/windows-xp-bliss-4k-lu-3840x2400/windows-xp-bliss-4k-lu-3840x2400.jpg",
  sha256: "4224a3ad6c75f58b074f8db9593a5af0d4e9b670701af7519bafc945c496026f",
  width: 3840,
  height: 2400,
};
const WORK = path.join(root, "work/bliss");
const OUT = path.join(root, "public/images/bliss");
const QA = path.join(root, "docs/qa/bliss");
const GEOMETRY = path.join(root, "src/lib/bliss-geometry.json");
const WIDTHS = [750, 1280, 1920, 2880, 3840];
/** Largest layer offset, as a share of the frame height. */
const TRAVEL = { sky: 0.06, foreground: 0.04 };
const FLOOR_SAMPLES = 97;

async function source() {
  fs.mkdirSync(WORK, { recursive: true });
  const file = path.join(WORK, "source.jpg");
  if (!fs.existsSync(file)) {
    const response = await fetch(SOURCE.url, { redirect: "follow" });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = fs.readFileSync(file);
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  if (digest !== SOURCE.sha256)
    throw new Error(`Unexpected source checksum ${digest}`);
  const { data, info } = await sharp(bytes)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== SOURCE.width || info.height !== SOURCE.height)
    throw new Error(`Unexpected size ${info.width}×${info.height}`);
  return { data, width: info.width, height: info.height };
}

const median = (values, radius) =>
  values.map((_, i) => {
    const window = values
      .slice(Math.max(0, i - radius), i + radius + 1)
      .toSorted((a, b) => a - b);
    return window[window.length >> 1];
  });
const smooth = (values, radius) =>
  values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - radius; j <= i + radius; j++) {
      sum += values[Math.min(values.length - 1, Math.max(0, j))];
      count++;
    }
    return sum / count;
  });

/** First row per column where green clearly dominates for 12 rows: the crest. */
function findCrest({ data, width, height }) {
  const isHill = (x, y) => {
    const o = (y * width + x) * 3;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    return g - b > 25 && g > r;
  };
  const from = Math.round(height * 0.35);
  const to = Math.round(height * 0.75);
  const crest = [];
  for (let x = 0; x < width; x++) {
    let run = 0;
    let found = to;
    for (let y = from; y < to; y++) {
      run = isHill(x, y) ? run + 1 : 0;
      if (run === 12) {
        found = y - 11;
        break;
      }
    }
    crest.push(found);
  }
  return median(crest, 15);
}

/** Smoothest path of strongest light-to-dark edge: the furrow's top. */
function findFurrow({ data, width, height }) {
  const from = Math.round(height * 0.74);
  const to = Math.round(height * 0.88);
  const step = 8;
  const win = 16;
  const luminance = (x, y) => {
    const o = (y * width + x) * 3;
    return (data[o] + data[o + 1] + data[o + 2]) / 3;
  };
  const columns = [];
  for (let x = 0; x < width; x += step) columns.push(x);
  const rows = to - from;
  const edge = columns.map((x) => {
    const values = new Float64Array(rows);
    for (let r = 0; r < rows; r++) {
      let above = 0;
      let below = 0;
      for (let k = 1; k <= win; k++) {
        above += luminance(x, from + r - k);
        below += luminance(x, from + r + k - 1);
      }
      values[r] = (above - below) / win;
    }
    return values;
  });
  // Dynamic programming: maximise edge strength, move at most 3 rows a step.
  let score = Float64Array.from(edge[0]);
  const back = [];
  for (let c = 1; c < columns.length; c++) {
    const next = new Float64Array(rows).fill(-Infinity);
    const choice = new Int8Array(rows);
    for (let r = 0; r < rows; r++)
      for (let d = -3; d <= 3; d++) {
        const p = r - d;
        if (p < 0 || p >= rows) continue;
        if (score[p] > next[r]) {
          next[r] = score[p];
          choice[r] = d;
        }
      }
    for (let r = 0; r < rows; r++) next[r] += edge[c][r];
    back.push(choice);
    score = next;
  }
  let r = score.indexOf(Math.max(...score));
  const path = [r];
  for (let c = columns.length - 1; c > 0; c--) {
    r -= back[c - 1][r];
    path.unshift(r);
  }
  const seam = [];
  for (let x = 0; x < width; x++) {
    const c = Math.min(columns.length - 2, Math.floor(x / step));
    const t = (x - columns[c]) / step;
    seam.push(Math.round(from + path[c] + (path[c + 1] - path[c]) * t));
  }
  return seam;
}

function layers(image, crest, furrow) {
  const { data, width, height } = image;
  const band = 28;
  const margin = 3;
  const pixel = (x, y) => {
    const o = (y * width + x) * 3;
    return [data[o], data[o + 1], data[o + 2]];
  };
  // Per column, the first land pixel scanning down through the crest band:
  // grass, the trees on it and the dark distant hills stay with the hill.
  const isLand = ([r, g, b]) =>
    (g - b > 5 && g > r * 0.9) || r + g + b < 3 * 110;
  const edge = median(
    crest.map((y0, x) => {
      for (let y = y0 - band; y <= y0 + band; y++)
        if (isLand(pixel(x, y))) return y - margin;
      return y0 - margin;
    }),
    4,
  );
  const skyTravel = Math.round(TRAVEL.sky * height);
  const fgTravel = Math.round(TRAVEL.foreground * height);

  // Sky: the photo above the edge. Behind the hill it continues as a mirror
  // of the sky just above the edge, seamless where the two meet.
  const sky = {
    top: -skyTravel,
    height: Math.max(...edge) + skyTravel + skyTravel,
    channels: 3,
  };
  sky.data = Buffer.alloc(width * sky.height * 3);
  for (let row = 0; row < sky.height; row++) {
    const y = sky.top + row;
    for (let x = 0; x < width; x++) {
      const o = (row * width + x) * 3;
      let source = y;
      if (y < 0)
        source = -y; // mirrored above the frame
      else if (y >= edge[x]) source = Math.max(0, 2 * edge[x] - y - 1);
      const [r, g, b] = pixel(x, source);
      sky.data[o] = r;
      sky.data[o + 1] = g;
      sky.data[o + 2] = b;
    }
  }

  // Hill: opaque from the edge to the furrow, then a mirror of itself that
  // only shows while the foreground slides down.
  const hill = { top: Math.min(...edge), channels: 4 };
  hill.height = Math.max(...furrow) + fgTravel + 8 - hill.top;
  hill.data = Buffer.alloc(width * hill.height * 4);
  for (let row = 0; row < hill.height; row++) {
    const y = hill.top + row;
    for (let x = 0; x < width; x++) {
      const o = (row * width + x) * 4;
      const source = y >= furrow[x] ? 2 * furrow[x] - y - 1 : y;
      const [r, g, b] = pixel(x, Math.min(height - 1, source));
      hill.data[o] = r;
      hill.data[o + 1] = g;
      hill.data[o + 2] = b;
      hill.data[o + 3] = y >= edge[x] ? 255 : 0;
    }
  }

  const foreground = { top: Math.min(...furrow), channels: 4 };
  foreground.height = height + fgTravel - foreground.top;
  foreground.data = Buffer.alloc(width * foreground.height * 4);
  for (let row = 0; row < foreground.height; row++) {
    const y = foreground.top + row;
    for (let x = 0; x < width; x++) {
      const o = (row * width + x) * 4;
      const source = y < height ? y : 2 * height - y - 1; // mirrored below
      const [r, g, b] = pixel(x, source);
      foreground.data[o] = r;
      foreground.data[o + 1] = g;
      foreground.data[o + 2] = b;
      foreground.data[o + 3] = y >= furrow[x] ? 255 : 0;
    }
  }
  return { sky, hill, foreground };
}

/** Recomposes the layers at rest and returns the largest channel difference. */
function parity(image, { sky, hill, foreground }) {
  const { data, width, height } = image;
  let worst = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let color = [0, 0, 0];
      const skyRow = y - sky.top;
      if (skyRow >= 0 && skyRow < sky.height) {
        const o = (skyRow * width + x) * 3;
        color = [sky.data[o], sky.data[o + 1], sky.data[o + 2]];
      }
      for (const layer of [hill, foreground]) {
        const row = y - layer.top;
        if (row < 0 || row >= layer.height) continue;
        const o = (row * width + x) * 4;
        if (layer.data[o + 3] === 255)
          color = [layer.data[o], layer.data[o + 1], layer.data[o + 2]];
      }
      const o = (y * width + x) * 3;
      for (let c = 0; c < 3; c++)
        worst = Math.max(worst, Math.abs(color[c] - data[o + c]));
    }
  return worst;
}

async function encode(name, layer, width) {
  const files = [];
  for (const target of WIDTHS) {
    const pipeline = () =>
      sharp(layer.data, {
        raw: { width, height: layer.height, channels: layer.channels },
      }).resize({ width: target });
    for (const [format, options] of [
      ["avif", { quality: 55, effort: 6 }],
      ["webp", { quality: 80, effort: 6, alphaQuality: 90 }],
    ]) {
      const file = path.join(OUT, `${name}-${target}.${format}`);
      await pipeline()[format](options).toFile(file);
      files.push(file);
    }
  }
  return files;
}

async function main() {
  const image = await source();
  const { width, height } = image;
  const crest = findCrest(image);
  const furrow = findFurrow(image);
  const parts = layers(image, crest, furrow);
  const worst = parity(image, parts);
  if (worst !== 0)
    throw new Error(`Layers differ from the original by ${worst}`);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(QA, { recursive: true });
  const files = [];
  for (const [name, layer] of Object.entries(parts))
    files.push(...(await encode(name, layer, width)));
  files.push(
    ...(await encode(
      "original",
      { data: image.data, height, channels: 3 },
      width,
    )),
  );

  // Physics floor: the crest smoothed and sampled evenly, in source pixels.
  const floor = smooth(crest, 30);
  const dx = (width - 1) / (FLOOR_SAMPLES - 1);
  const samples = Array.from(
    { length: FLOOR_SAMPLES },
    (_, i) => Math.round(floor[Math.round(i * dx)] * 10) / 10,
  );
  const hash = crypto.createHash("sha256");
  for (const file of files.toSorted()) hash.update(fs.readFileSync(file));
  const geometry = {
    revision: hash.digest("hex").slice(0, 16),
    width,
    height,
    focal: [0.5, 0.56],
    travel: TRAVEL,
    widths: WIDTHS,
    layers: Object.fromEntries(
      Object.entries(parts).map(([name, layer]) => [
        name,
        { top: layer.top, height: layer.height },
      ]),
    ),
    floor: { dx: Math.round(dx * 1000) / 1000, samples },
  };
  fs.writeFileSync(GEOMETRY, `${JSON.stringify(geometry, null, 2)}\n`);

  // Review aids: the detected boundaries over the photo, and byte sizes.
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <polyline fill="none" stroke="#ff2d2d" stroke-width="6" points="${samples.map((y, i) => `${Math.round(i * dx)},${y}`).join(" ")}"/>
      <polyline fill="none" stroke="#ffd400" stroke-width="6" points="${furrow
        .filter((_, x) => x % 16 === 0)
        .map((y, i) => `${i * 16},${y}`)
        .join(" ")}"/>
    </svg>`,
  );
  // sharp resizes before compositing, so composite at full size first.
  const annotated = await sharp(image.data, {
    raw: { width, height, channels: 3 },
  })
    .composite([{ input: overlay }])
    .png()
    .toBuffer();
  await sharp(annotated)
    .resize({ width: 1600 })
    .webp({ quality: 80 })
    .toFile(path.join(QA, "boundaries.webp"));
  const sizes = Object.fromEntries(
    files.map((file) => [path.basename(file), fs.statSync(file).size]),
  );
  fs.writeFileSync(
    path.join(QA, "parity.json"),
    `${JSON.stringify({ sourceSha256: SOURCE.sha256, maxChannelDifferenceAtRest: worst, sizes }, null, 2)}\n`,
  );
  console.log(
    `Bliss: ${files.length} files, exact at rest, revision ${geometry.revision}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
