import { describe, expect, it } from "vitest";
import {
  CubeReflectionMapping,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  PMREMGenerator,
  type WebGLRenderer,
} from "three";
import {
  studioLength,
  studioTexture,
  toHalves,
} from "../src/components/desk/studio";

describe("the shared studio environment", () => {
  it("converts the read-back floats to the very half floats drawn", async () => {
    // A 1 × 1 cube: one texel per face, so no mirroring within a face.
    const halves = [0, 0x3c00, 0x3555, 0x0001, 0x7bff, 0x8400, 0x1234, 0x3c00];
    const faces = Array.from({ length: 6 }, (_, face) =>
      halves.slice(face % 2, (face % 2) + 4),
    ).flat();
    const floats = Float32Array.from(faces, DataUtils.fromHalfFloat);
    const pixels = await toHalves(floats, 1, 1);
    // The two x faces trade places; the others stay.
    const expected = [1, 0, 2, 3, 4, 5].flatMap((face) =>
      faces.slice(face * 4, face * 4 + 4),
    );
    expect([...pixels!.data]).toEqual(expected);
  });

  it("mirrors every face left to right", async () => {
    // A 2 × 2 cube with one level: texel x of each row lands at 1 − x.
    const floats = new Float32Array(studioLength(2, 1));
    for (let i = 0; i < floats.length; i += 4) floats[i] = i / 4 + 1;
    const pixels = await toHalves(floats, 2, 1);
    const red = (index: number) =>
      DataUtils.fromHalfFloat(pixels!.data[index * 4]);
    // Face 2 (+y) starts at texel 8: rows [9, 10] and [11, 12] become
    // [10, 9] and [12, 11].
    expect([8, 9, 10, 11].map(red)).toEqual([10, 9, 12, 11]);
    // Face 0 (+x) takes face 1's texels (5–8), mirrored.
    expect([0, 1, 2, 3].map(red)).toEqual([6, 5, 8, 7]);
  });

  it("treats a read that wrote nothing as no copy", async () => {
    expect(
      await toHalves(new Float32Array(studioLength(2, 2)), 2, 2),
    ).toBeNull();
  });

  it("uploads the copy as a mipmapped cube three takes for a PMREM", () => {
    const size = 256;
    const levels = 6;
    const texture = studioTexture({
      data: new Uint16Array(studioLength(size, levels)),
      size,
      levels,
    });
    expect(texture.isPMREMTexture).toBe(true);
    expect(texture.isCubeTexture).toBe(true);
    expect(texture.mapping).toBe(CubeReflectionMapping);
    expect(texture.type).toBe(HalfFloatType);
    expect(texture.minFilter).toBe(LinearMipmapLinearFilter);
    expect(texture.magFilter).toBe(LinearFilter);
    expect(texture.generateMipmaps).toBe(false);
    // The shaders read the roughest level and the size from face 0's chain.
    const faces = texture.image as unknown as {
      width: number;
      mipmaps: { width: number; data: Uint16Array }[];
    }[];
    expect(faces).toHaveLength(6);
    expect(faces[0].mipmaps.map((mip) => mip.width)).toEqual([
      256, 128, 64, 32, 16, 8,
    ]);
    expect(faces[5].mipmaps[5].data.length).toBe(8 * 8 * 4);
  });

  it("still finds the generator internals it links early", () => {
    // studio.ts reads these to link the PMREM programs in the background; a
    // three upgrade that renames them would quietly lose that.
    const generator = new PMREMGenerator({} as WebGLRenderer) as unknown as {
      _setSize: (size: number) => void;
      _allocateTarget: () => {
        width: number;
        texture: { mipmaps: unknown[] };
      };
      _getSourceTarget: () => unknown;
      _applyPMREM: (target: unknown) => void;
      _renderCube: unknown;
      _boxMesh: { geometry: unknown };
      _cubeCamera: { children: unknown[] };
      _ggxMaterial: unknown;
      _integrationMaterial: unknown;
      compileCubemapShader: unknown;
    };
    generator._setSize(128);
    const target = generator._allocateTarget();
    // Smaller sizes are raised to 256, which leaves six levels.
    expect(target.width).toBe(256);
    expect(target.texture.mipmaps).toHaveLength(6);
    generator._getSourceTarget();
    generator._renderCube = () => {};
    generator._applyPMREM(target);
    expect(generator._ggxMaterial).toBeTruthy();
    expect(generator._integrationMaterial).toBeTruthy();
    expect(generator._boxMesh.geometry).toBeTruthy();
    expect(generator._cubeCamera.children).toHaveLength(6);
    expect(typeof generator.compileCubemapShader).toBe("function");
  });
});
