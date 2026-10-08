import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Matrix4, PerspectiveCamera, Vector3, Vector4 } from "three";
import contract from "../src/lib/desk-scene.json";
import {
  createScreenProjection,
  projectScreen,
} from "../src/lib/desk-projection";

describe("desk delivery model", () => {
  const bytes = readFileSync("public/models/desk/onur-desk.glb");
  const gltf = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  it("keeps geometry, transfer and material budgets and integration anchors", () => {
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.length).toBeLessThanOrEqual(1_500_000);
    const triangles = gltf.meshes
      .flatMap((m: { primitives: { indices: number }[] }) => m.primitives)
      .reduce(
        (n: number, p: { indices: number }) =>
          n + gltf.accessors[p.indices].count / 3,
        0,
      );
    // Trimmed for the web (scripts/desk/optimize.mjs): 97,095 → 50,577.
    expect(triangles).toBeLessThanOrEqual(60_000);
    expect(gltf.asset.extras?.webOptimized).toBe(true);
    expect(gltf.materials.length).toBeLessThanOrEqual(50);
    for (const id of Object.keys(contract.screens))
      expect(
        gltf.nodes.some((node: { name: string }) => node.name === id),
      ).toBe(true);
    expect(
      gltf.images.every(
        (image: { uri?: string; bufferView?: number }) =>
          !image.uri && image.bufferView !== undefined,
      ),
    ).toBe(true);
    expect(gltf.extensionsRequired).toContain("KHR_draco_mesh_compression");
  });
  it("ships each texture once and the baked desk maps at 512 px", () => {
    const chunk = bytes.readUInt32LE(12);
    const bin = bytes.subarray(20 + chunk + 8);
    const images = gltf.images.map(
      (image: { bufferView: number; name: string }) => {
        const view = gltf.bufferViews[image.bufferView];
        return {
          name: image.name,
          bytes: bin.subarray(
            view.byteOffset ?? 0,
            (view.byteOffset ?? 0) + view.byteLength,
          ),
        };
      },
    );
    const hashes = images.map((image: { bytes: Buffer }) =>
      createHash("sha256").update(image.bytes).digest("hex"),
    );
    expect(new Set(hashes).size).toBe(hashes.length);
    for (const image of images.filter((entry: { name: string }) =>
      entry.name.startsWith("Baked "),
    )) {
      // JPEG: the frame header holds height then width.
      const sof = image.bytes.findIndex(
        (byte: number, i: number) =>
          byte === 0xff && [0xc0, 0xc2].includes(image.bytes[i + 1]),
      );
      expect(image.bytes.readUInt16BE(sof + 7)).toBeLessThanOrEqual(512);
    }
  });
  it("delivers authored surface normals in the web model, not only in Blender", () => {
    for (const name of [
      "Woven black textile",
      "Soft touch rubber",
      "Space grey aluminium",
      "Graphite polymer",
      "Keycap graphite",
    ]) {
      const material = gltf.materials.find(
        (entry: { name: string }) => entry.name === name,
      );
      expect(material.normalTexture).toBeDefined();
      const image =
        gltf.images[gltf.textures[material.normalTexture.index].source];
      expect(image.bufferView).toBeDefined();
      expect(image.uri).toBeUndefined();
    }
  });
  it("aligns monitor tops and halves the previous MacBook housing clearance", () => {
    const portrait = contract.screens.PortraitScreen;
    const wide = contract.screens.UltrawideScreen;
    expect(portrait.position[1] + portrait.height / 2).toBeCloseTo(
      wide.position[1] + wide.height / 2,
      5,
    );
    const laptopTop =
      0.006 +
      0.023 +
      0.2105 * Math.cos(Math.PI / 15) +
      0.003 * Math.sin(Math.PI / 15);
    const previousGap = 0.433 - 0.155 - laptopTop;
    expect(wide.position[1] - 0.155 - laptopTop).toBeCloseTo(
      previousGap / 2,
      5,
    );
  });
  it("records the loading capture against the current model", () => {
    const poster = JSON.parse(
      readFileSync("docs/qa/desk/loading-poster.json", "utf8"),
    );
    expect(poster.modelSha256).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    expect([poster.width, poster.height]).toEqual([1280, 960]);
  });
  it("ships all four static fallbacks and the revised desk footprint", () => {
    expect(contract.desk).toEqual({ width: 1.5, depth: 0.87 });
    expect(contract.cameras.map((c) => c.id)).toEqual([
      "wide",
      "portrait",
      "ultrawide",
      "macbook",
    ]);
    for (const { id } of contract.cameras)
      expect(existsSync(`public/images/desk/${id}.webp`)).toBe(true);
  });
});

describe("HTML to 3D projection", () => {
  it("matches all four projected screen corners across camera stops and viewport shapes", () => {
    for (const [width, height] of [
      [1260, 720],
      [358, 550],
    ]) {
      for (const preset of contract.cameras) {
        const camera = new PerspectiveCamera(43, width / height, 0.01, 12);
        camera.position.fromArray(preset.position);
        camera.lookAt(new Vector3(...preset.target));
        camera.updateMatrixWorld();
        for (const screen of Object.values(contract.screens)) {
          const projection = createScreenProjection(screen);
          const css = projectScreen(projection, camera, width, height)!;
          expect(css).not.toBeNull();
          const matrix = new Matrix4().fromArray(css);
          expect(Math.abs(matrix.determinant())).toBeGreaterThan(1e-10);
          for (const x of [0, 1000])
            for (const y of [0, (1000 * screen.height) / screen.width]) {
              const world = new Vector3(x, y, 0)
                .applyMatrix4(projection.model)
                .project(camera);
              const html = new Vector4(x, y, 0, 1).applyMatrix4(matrix);
              expect(html.x / html.w).toBeCloseTo(
                ((world.x + 1) * width) / 2,
                5,
              );
              expect(html.y / html.w).toBeCloseTo(
                ((1 - world.y) * height) / 2,
                5,
              );
            }
        }
      }
    }
  });
  it("hides screens behind the camera", () => {
    const camera = new PerspectiveCamera(43, 1, 0.01, 12);
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 3);
    camera.updateMatrixWorld();
    expect(
      projectScreen(
        createScreenProjection(contract.screens.UltrawideScreen),
        camera,
        500,
        500,
      ),
    ).toBeNull();
  });
});
