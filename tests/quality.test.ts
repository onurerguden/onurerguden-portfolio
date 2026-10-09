import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyGpu } from "../src/lib/quality";

const gpu = (renderer: string, memory?: number, cores?: number) =>
  classifyGpu({ renderer, memory, cores });

describe("3D quality per computer", () => {
  it("gives the full desk to Apple silicon and dedicated graphics", () => {
    for (const renderer of [
      "ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)",
      "Apple GPU",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    ])
      expect(gpu(renderer, 8, 8), renderer).toBe("high");
  });
  it("lightens the desk on integrated graphics", () => {
    for (const renderer of [
      "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (Intel Inc., Intel(R) HD Graphics 6000, OpenGL 4.1)",
      "ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "ANGLE (AMD, AMD Radeon Vega 8 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
    ])
      expect(gpu(renderer, 8, 8), renderer).toBe("low");
  });
  it("lightens it on computers with little memory or few cores", () => {
    expect(gpu("", 4, 8)).toBe("low");
    expect(gpu("", 8, 4)).toBe("low");
    expect(gpu("", 8, 8)).toBe("high");
    expect(gpu("")).toBe("high");
  });
  it("tells an Intel Mac from Apple silicon in Safari", () => {
    // Safari reports every Mac GPU as "Apple GPU"; only Apple's decode ASTC.
    expect(classifyGpu({ renderer: "Apple GPU", astc: true })).toBe("high");
    expect(classifyGpu({ renderer: "Apple GPU", astc: false })).toBe("low");
    expect(classifyGpu({ renderer: "Apple GPU" })).toBe("high");
  });
  it("reads the plain flow without GPU acceleration", () => {
    for (const renderer of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
    ])
      expect(gpu(renderer, 16, 16), renderer).toBe("static");
  });
});

describe("the WebGL probe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });
  it("creates one context for the quality tier and the section stages", async () => {
    const lose = vi.fn();
    const context = {
      getExtension: (name: string) =>
        name === "WEBGL_debug_renderer_info"
          ? { UNMASKED_RENDERER_WEBGL: 0x9246 }
          : { loseContext: lose },
      getParameter: () => "ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro)",
    };
    const createElement = vi.fn(() => ({ getContext: () => context }));
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      createElement,
      documentElement: { dataset: {} },
    });
    vi.stubGlobal("localStorage", { getItem: () => null });
    vi.stubGlobal("navigator", { hardwareConcurrency: 8, deviceMemory: 8 });
    vi.resetModules();
    const { quality } = await import("../src/lib/quality");
    const { supportsWebGL2 } =
      await import("../src/components/three/use-section-stage");
    expect(quality()).toBe("high");
    expect(supportsWebGL2()).toBe(true);
    expect(createElement).toHaveBeenCalledTimes(1);
    expect(lose).toHaveBeenCalledTimes(1);
  });
});
