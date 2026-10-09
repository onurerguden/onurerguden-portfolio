import {
  BackSide,
  DoubleSide,
  FrontSide,
  InstancedMesh,
  Mesh,
  MeshDepthMaterial,
  Scene,
  Texture,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Object3D,
  type WebGLRenderer,
} from "three";
import { frameSlices, yieldToFrame } from "@/lib/yield";

export type WarmUpStep =
  "textures" | "programs" | "offscreen" | "frame" | "gpu";

/**
 * Prepares a scene so that its first visible frame has nothing left to
 * compile or upload, without blocking the page. Run it while the canvas is
 * hidden and draws nothing else; it resolves once the scene can show.
 *
 * - Work runs in slices of a few milliseconds, one slice per frame, so the
 *   page keeps painting (and scrolling) at its own pace meanwhile.
 * - Textures upload one at a time.
 * - Programs compile with `compileAsync`, a slice's worth at a time: where
 *   KHR_parallel_shader_compile is available the browser links them in the
 *   background, so a first visit (no shader cache anywhere) costs seconds of
 *   waiting rather than seconds of a frozen page. That includes the shadow
 *   pass's depth programs and, with `offscreen`, the variants for drawing
 *   the scene into a render target (reflections draw without tone mapping).
 * - three asks each program for its uniforms on first use, which waits for
 *   everything queued before it; asked now, nothing is queued.
 * - `render` draws the scene's real first frame, hidden. The GPU then builds
 *   a pipeline for each program it draws with, hundreds of milliseconds on
 *   a first visit; a fence tells when it is done, and only then does the
 *   scene show, so the first visible frames do not wait for it.
 */
export async function warmUp({
  gl,
  scene,
  camera,
  render,
  cancelled,
  offscreen = false,
  onStep,
}: {
  gl: WebGLRenderer;
  scene: Scene;
  camera: Camera;
  /** Draws the scene's real first frame. */
  render: () => void;
  cancelled: () => boolean;
  /** Also compile the scene for drawing into a render target. */
  offscreen?: boolean;
  onStep?: (step: WarmUpStep) => void;
}) {
  // Marked for the performance harness (scripts/perf).
  const step = (name: WarmUpStep) => {
    performance.mark(`portfolio:warm:${name}`);
    onStep?.(name);
  };
  const slice = frameSlices();
  step("textures");
  for (const texture of textures(scene)) {
    await slice();
    if (cancelled()) return false;
    gl.initTexture(texture);
  }
  step("programs");
  const drawn: Object3D[] = [];
  // Hidden objects too: a scene may keep something hidden until it is warm.
  scene.traverse((object) => {
    if ("material" in object && "geometry" in object) drawn.push(object);
  });
  const linking: Promise<unknown>[] = [];
  for (const object of drawn) {
    await slice();
    if (cancelled()) return false;
    linking.push(gl.compileAsync(object, camera, scene));
  }
  step("offscreen");
  await slice();
  if (cancelled()) return false;
  const shadows = gl.shadowMap.enabled ? shadowCasters(drawn) : null;
  if (shadows || offscreen) {
    const target = new WebGLRenderTarget(1, 1);
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(target);
    // compile() runs synchronously inside compileAsync, so only that call
    // needs the target bound; the wait for linking does not.
    if (offscreen) linking.push(gl.compileAsync(scene, camera));
    if (shadows) linking.push(gl.compileAsync(shadows, camera, scene));
    gl.setRenderTarget(previous);
    target.dispose();
  }
  await Promise.all(linking);
  for (const program of gl.info.programs ?? []) {
    await slice();
    if (cancelled()) break;
    program.getUniforms();
    program.getAttributes();
  }
  step("frame");
  // The hidden frame starts a slice of its own.
  await yieldToFrame();
  if (!cancelled()) render();
  // Only now: a program whose last material is disposed is deleted, and the
  // shadow pass has just taken its own reference to these.
  shadows?.traverse((object) => {
    if (object instanceof Mesh) object.material.dispose();
  });
  if (cancelled()) return false;
  step("gpu");
  await gpuIdle(gl.getContext(), cancelled);
  performance.mark("portfolio:warm:done");
  return !cancelled();
}

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Resolves once the GPU has finished everything sent so far, checking once a
 * frame without waiting on it (a fence's status is read asynchronously).
 * Gives up after a few seconds, or at once where WebGL 2 is missing.
 */
async function gpuIdle(
  context: WebGLRenderingContext | WebGL2RenderingContext,
  cancelled: () => boolean,
  timeout = 4000,
) {
  if (!("fenceSync" in context)) return;
  const fence = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!fence) return;
  context.flush();
  const start = performance.now();
  try {
    while (performance.now() - start < timeout && !cancelled()) {
      await nextFrame();
      if (
        context.getSyncParameter(fence, context.SYNC_STATUS) ===
        context.SIGNALED
      )
        return;
    }
  } finally {
    context.deleteSync(fence);
  }
}

/** Every texture the scene's materials use, once each. */
export function textures(scene: Object3D) {
  const found = new Set<Texture>();
  scene.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    if (!material) return;
    for (const entry of Array.isArray(material) ? material : [material])
      for (const value of Object.values(entry))
        if (value instanceof Texture && !value.isRenderTargetTexture)
          found.add(value);
  });
  return [...found];
}

/**
 * Stand-ins drawn with the depth material three's shadow pass would choose
 * for each caster (WebGLShadowMap's getDepthMaterial): compiling them links
 * the shadow programs in the background too. Programs are shared by their
 * parameters, so the real shadow pass finds them ready. They share the
 * casters' geometry and are never drawn.
 */
export function shadowCasters(objects: Object3D[]) {
  const proxies = new Scene();
  const shadowSide = {
    [FrontSide]: BackSide,
    [BackSide]: FrontSide,
    [DoubleSide]: DoubleSide,
  };
  objects.forEach((object) => {
    if (!(object instanceof Mesh) || !object.castShadow) return;
    if (object.customDepthMaterial) return;
    const materials: Material[] = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      const source = material as Material & {
        map?: Texture | null;
        alphaMap?: Texture | null;
        displacementMap?: Texture | null;
        displacementScale?: number;
        displacementBias?: number;
      };
      const depth = new MeshDepthMaterial({
        side: material.shadowSide ?? shadowSide[material.side],
        alphaTest: material.alphaToCoverage ? 0.5 : material.alphaTest,
        map: source.map ?? null,
        alphaMap: source.alphaMap ?? null,
        displacementMap: source.displacementMap ?? null,
        displacementScale: source.displacementScale ?? 1,
        displacementBias: source.displacementBias ?? 0,
      });
      const proxy =
        object instanceof InstancedMesh
          ? new InstancedMesh(object.geometry, depth, object.count)
          : new Mesh(object.geometry, depth);
      proxy.receiveShadow = object.receiveShadow;
      proxies.add(proxy);
    }
  });
  return proxies;
}
