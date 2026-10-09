import { describe, expect, it } from "vitest";
import {
  CubeUVReflectionMapping,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  PMREMGenerator,
  type WebGLRenderer,
} from "three";
import { studioTexture, toHalves } from "../src/components/desk/studio";

describe("the shared studio environment", () => {
  it("converts the read-back floats to the very half floats drawn", async () => {
    const halves = [0, 0x3c00, 0x3555, 0x0001, 0x7bff, 0x8400, 0x1234];
    const floats = Float32Array.from(halves, DataUtils.fromHalfFloat);
    const pixels = await toHalves(floats, 1, 1);
    expect([...pixels!.data]).toEqual(halves);
  });

  it("treats a read that wrote nothing as no copy", async () => {
    expect(await toHalves(new Float32Array(16), 2, 2)).toBeNull();
  });

  it("uploads the copy as the cube-UV texture three's generator makes", () => {
    const texture = studioTexture({
      data: new Uint16Array(384 * 512 * 4),
      width: 384,
      height: 512,
    });
    expect(texture.mapping).toBe(CubeUVReflectionMapping);
    expect(texture.type).toBe(HalfFloatType);
    expect(texture.minFilter).toBe(LinearFilter);
    expect(texture.magFilter).toBe(LinearFilter);
    expect(texture.generateMipmaps).toBe(false);
    expect(texture.flipY).toBe(false);
    // The shaders size their cube-UV lookups from the image's height.
    expect(texture.image.height).toBe(512);
  });

  it("still finds the generator internals it links early", () => {
    // studio.ts reads these to link the PMREM programs in the background; a
    // three upgrade that renames them would quietly lose that.
    const generator = new PMREMGenerator({} as WebGLRenderer) as unknown as {
      _setSize: (size: number) => void;
      _allocateTargets: () => { width: number; height: number };
      _lodMeshes: unknown[];
      _ggxMaterial: unknown;
      compileCubemapShader: unknown;
    };
    generator._setSize(128);
    const target = generator._allocateTargets();
    expect([target.width, target.height]).toEqual([384, 512]);
    expect(generator._lodMeshes.length).toBeGreaterThan(0);
    expect(generator._ggxMaterial).toBeTruthy();
    expect(typeof generator.compileCubemapShader).toBe("function");
  });
});
