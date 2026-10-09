import { describe, expect, it } from "vitest";
import {
  BoxGeometry,
  DoubleSide,
  FrontSide,
  BackSide,
  Mesh,
  MeshDepthMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Texture,
  type WebGLRenderer,
} from "three";
import {
  delayWarmUp,
  shadowCasters,
  textures,
  warmUp,
} from "../src/components/three/warm-up";

/** A renderer that records what the warm-up asks of it. */
function fakeRenderer({ shadows = false } = {}) {
  const calls: string[] = [];
  let target: unknown = null;
  const gl = {
    initTexture: () => calls.push("texture"),
    compileAsync: async () => {
      calls.push(target ? "compile:target" : "compile");
      await Promise.resolve();
      calls.push("linked");
    },
    getRenderTarget: () => target,
    setRenderTarget: (next: unknown) => (target = next),
    shadowMap: { enabled: shadows },
    info: {
      programs: [
        {
          getUniforms: () => calls.push("uniforms"),
          getAttributes: () => {},
        },
      ],
    },
    getContext: () => ({}),
  };
  return { gl: gl as unknown as WebGLRenderer, calls };
}

function scene() {
  const root = new Scene();
  const material = new MeshStandardMaterial({ map: new Texture() });
  const mesh = new Mesh(new BoxGeometry(), material);
  mesh.castShadow = true;
  root.add(mesh);
  return root;
}

describe("scene warm-up", () => {
  it("uploads, compiles and links everything before the first frame", async () => {
    const { gl, calls } = fakeRenderer();
    const ready = await warmUp({
      gl,
      scene: scene(),
      camera: new PerspectiveCamera(),
      render: () => calls.push("render"),
      cancelled: () => false,
    });
    expect(ready).toBe(true);
    expect(calls).toEqual([
      "texture",
      "compile",
      "linked",
      "uniforms",
      "render",
    ]);
  });

  it("compiles shadow and render-target variants with a target bound", async () => {
    const { gl, calls } = fakeRenderer({ shadows: true });
    await warmUp({
      gl,
      scene: scene(),
      camera: new PerspectiveCamera(),
      render: () => calls.push("render"),
      cancelled: () => false,
      offscreen: true,
    });
    expect(calls.filter((call) => call === "compile:target")).toHaveLength(2);
    expect(calls.indexOf("render")).toBeGreaterThan(
      calls.lastIndexOf("linked"),
    );
    expect(gl.getRenderTarget()).toBeNull();
  });

  it("stops without drawing once cancelled", async () => {
    const { gl, calls } = fakeRenderer();
    let cancelled = false;
    const pending = warmUp({
      gl,
      scene: scene(),
      camera: new PerspectiveCamera(),
      render: () => calls.push("render"),
      cancelled: () => cancelled,
    });
    cancelled = true;
    expect(await pending).toBe(false);
    expect(calls).not.toContain("render");
  });

  it("waits for what the scene asked for, then uploads its environment too", async () => {
    const { gl, calls } = fakeRenderer();
    const root = scene();
    let resolve = () => {};
    delayWarmUp(root, new Promise<void>((done) => (resolve = done)));
    const pending = warmUp({
      gl,
      scene: root,
      camera: new PerspectiveCamera(),
      render: () => calls.push("render"),
      cancelled: () => false,
    });
    await new Promise((done) => setTimeout(done, 5));
    expect(calls).toEqual([]);
    root.environment = new Texture();
    calls.push("environment");
    resolve();
    expect(await pending).toBe(true);
    expect(calls.slice(0, 4)).toEqual([
      "environment",
      "texture",
      "texture",
      "compile",
    ]);
  });

  it("gives up while waiting once cancelled", async () => {
    const { gl, calls } = fakeRenderer();
    const root = scene();
    let cancelled = false;
    delayWarmUp(
      root,
      new Promise<void>((done) => setTimeout(done, 5)).then(() => {
        cancelled = true;
      }),
    );
    const ready = await warmUp({
      gl,
      scene: root,
      camera: new PerspectiveCamera(),
      render: () => calls.push("render"),
      cancelled: () => cancelled,
    });
    expect(ready).toBe(false);
    expect(calls).toEqual([]);
  });

  it("finds each texture once", () => {
    const map = new Texture();
    const root = new Scene();
    root.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map })));
    root.add(
      new Mesh(
        new BoxGeometry(),
        new MeshStandardMaterial({ map, normalMap: new Texture() }),
      ),
    );
    expect(textures(root)).toHaveLength(2);
  });

  it("stands in for casters with the depth material three's shadow pass uses", () => {
    const sides = [FrontSide, BackSide, DoubleSide].map((side) => {
      const mesh = new Mesh(
        new BoxGeometry(),
        new MeshStandardMaterial({ side }),
      );
      mesh.castShadow = true;
      return mesh;
    });
    const quiet = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    const proxies = shadowCasters([...sides, quiet]).children as Mesh[];
    expect(proxies).toHaveLength(3);
    expect(
      proxies.map((proxy) => (proxy.material as MeshDepthMaterial).side),
    ).toEqual([BackSide, FrontSide, DoubleSide]);
    expect(proxies[0].geometry).toBe(sides[0].geometry);
  });
});
