import { describe, expect, it } from "vitest";
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
  it("reads the plain flow without GPU acceleration", () => {
    for (const renderer of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
    ])
      expect(gpu(renderer, 16, 16), renderer).toBe("static");
  });
});
