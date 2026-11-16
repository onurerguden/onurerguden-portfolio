import type { Scene, WebGLRenderer } from "three";
import { qa } from "@/lib/qa";

type Offered = {
  scene: Scene;
  gl: WebGLRenderer;
  invalidate: () => void;
};

/**
 * For scripts/perf/ablate.mjs, on a QA visit only (src/lib/qa.ts): the live
 * scenes by name, so the script can hide one part at a time, or change a
 * material, and time the frame without it. A visitor's page never holds
 * them.
 */
export function offerScene(
  id: string,
  scene: Scene,
  gl: WebGLRenderer,
  invalidate: () => void,
) {
  if (!qa()) return () => {};
  const holder = window as typeof window & {
    __portfolioScenes?: Record<string, Offered>;
  };
  const scenes = (holder.__portfolioScenes ??= {});
  scenes[id] = { scene, gl, invalidate };
  return () => {
    if (scenes[id]?.scene === scene) delete scenes[id];
  };
}
