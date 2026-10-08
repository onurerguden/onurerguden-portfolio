// Trims the desk model for the web after Blender exports it
// (scripts/desk/build.py writes public/models/desk/onur-desk.glb; run this
// next, then `npm run desk:package`). Small accessories carry most of the
// triangles but are seen from a metre away: each listed batch is simplified
// to a share of its triangles, within an error bound so silhouettes hold.
// The two baked desk textures are nearly flat and drop to 512 px, identical
// images and meshes are shared, and the result is Draco-compressed again.
//
// It refuses a model it has already trimmed: simplifying twice would trim
// twice. Rebuild with Blender first.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  prune,
  simplifyPrimitive,
  textureCompress,
  weldPrimitive,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import draco3d from "draco3dgltf";
import sharp from "sharp";

const file = "public/models/desk/onur-desk.glb";

/** Share of vertices kept per batch node (interaction + material). */
const budgets = {
  "Batch headphones Soft touch rubber": 0.25, // cushion perimeter seam, 16.3k
  "Batch mouse Soft touch rubber": 0.5, // sculpted surface, 10k
  "Batch mouse Anodised aluminium": 0.25, // button parting seam, 9.6k
  "Batch static Soft touch rubber": 0.3, // keyboard cushion seam, 9.6k
  "Batch static Keycap graphite": 0.75, // ISO return profile, 8.6k
  "Batch static Graphite polymer": 0.35, // MacBook display cable, 6.1k
  "Batch static Anodised aluminium": 0.5, // monitor parting line, 5.7k
  "Batch static Satin black metal": 0.7, // BRYTET frame, 5.7k
  "Batch lamp Rose opal diffuser": 0.5, // diffuser, 3.5k
  "Batch headphones Graphite polymer": 0.6, // outer headband, 2.9k
};

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });
const document = await io.read(file);
const asset = document.getRoot().getAsset();
if (asset.extras?.webOptimized) {
  console.error(`${file} is already trimmed; rebuild it with Blender first.`);
  process.exit(1);
}

const triangles = () =>
  document
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives())
    .reduce(
      (sum, primitive) =>
        sum +
        (primitive.getIndices()?.getCount() ??
          primitive.getAttribute("POSITION").getCount()) /
          3,
      0,
    );
const before = triangles();

await MeshoptSimplifier.ready;
await document.transform(dedup());
const simplified = new Set();
for (const node of document.getRoot().listNodes()) {
  const ratio = budgets[node.getName()];
  const mesh = node.getMesh();
  if (ratio === undefined || !mesh || simplified.has(mesh)) continue;
  simplified.add(mesh);
  for (const primitive of mesh.listPrimitives()) {
    weldPrimitive(primitive);
    // Within a fraction of the batch's radius: thin seams keep their shape.
    simplifyPrimitive(primitive, {
      simplifier: MeshoptSimplifier,
      ratio,
      error: 0.002,
    });
  }
}
const missing = Object.keys(budgets).filter(
  (name) =>
    !document
      .getRoot()
      .listNodes()
      .some((n) => n.getName() === name),
);
if (missing.length) throw new Error(`No batch named ${missing.join(", ")}`);

await document.transform(
  // The baked desk and mat textures are nearly flat.
  textureCompress({
    encoder: sharp,
    pattern: /^Baked /,
    resize: [512, 512],
    targetFormat: "jpeg",
  }),
  dedup(),
  // The microstructure normal maps are nearly flat but authored: keep them.
  prune({ keepAttributes: true, keepLeaves: true, keepSolidTextures: true }),
  draco({ method: "edgebreaker" }),
);
asset.extras = { ...asset.extras, webOptimized: true };
await io.write(file, document);
console.log(`${before} → ${triangles()} triangles`);
