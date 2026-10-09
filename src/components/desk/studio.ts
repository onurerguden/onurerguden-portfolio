import {
  BufferGeometry,
  ClampToEdgeWrapping,
  Color,
  CubeCamera,
  CubeUVReflectionMapping,
  DataTexture,
  DataUtils,
  DoubleSide,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  PMREMGenerator,
  RGBAFormat,
  Scene,
  WebGLCubeRenderTarget,
  UVMapping,
  type Camera,
  type Material,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";
import { delayWarmUp } from "@/components/three/warm-up";
import { frameSlices } from "@/lib/yield";

/** Three soft panels around the desk, as [color, intensity, position, scale]. */
const panels = [
  ["#fff3df", 3, [-2, 2, 1], [1.5, 3]],
  ["#dce8ff", 1.5, [2, 1, 0], [1, 2]],
  ["#ffe6cf", 1, [0, 3, -1], [3, 1]],
] as const;
const cubeSize = 128;
const intensity = 0.55;

export type StudioPixels = { data: Uint16Array; width: number; height: number };

/**
 * The studio's prefiltered environment (PMREM), copied to the CPU from the
 * first context that made it. Every scene on the page lights itself with the
 * same three panels, so the others upload this copy instead of drawing the
 * panels and filtering them again: that took three programs and a few
 * hundred milliseconds of linking per context on a first visit.
 */
let copy: StudioPixels | null = null;
/** Pending while a context makes it; the others wait rather than repeat it. */
let making: Promise<StudioPixels | null> | null = null;

/**
 * Lights `scene` with the studio and returns a function that takes it away.
 * With a copy at hand the environment is set at once; otherwise this
 * context makes it, without blocking, and the scene's warm-up waits.
 */
export function lightStudio(gl: WebGLRenderer, scene: Scene) {
  const previous = {
    environment: scene.environment,
    intensity: scene.environmentIntensity,
  };
  let disposed = false;
  let release = () => {};
  const apply = (texture: Texture, dispose: () => void) => {
    scene.environment = texture;
    scene.environmentIntensity = intensity;
    release = dispose;
  };
  const upload = (pixels: StudioPixels) => {
    const texture = studioTexture(pixels);
    apply(texture, () => texture.dispose());
  };
  if (copy) upload(copy);
  else
    delayWarmUp(
      scene,
      (async () => {
        // Another context is already making it: wait for its copy.
        const pixels = making ? await making : null;
        if (disposed) return;
        if (pixels) return upload(pixels);
        const made = await makeStudio(gl, () => disposed);
        if (disposed) made?.dispose();
        else if (made) apply(made.texture, () => made.dispose());
      })(),
    );
  return () => {
    disposed = true;
    scene.environment = previous.environment;
    scene.environmentIntensity = previous.intensity;
    release();
  };
}

/** The copy as a texture three samples exactly as it did the original. */
export function studioTexture({ data, width, height }: StudioPixels) {
  const texture = new DataTexture(
    data,
    width,
    height,
    RGBAFormat,
    HalfFloatType,
    UVMapping,
    ClampToEdgeWrapping,
    ClampToEdgeWrapping,
    LinearFilter,
    LinearFilter,
  );
  // Not a mapping the constructor's types allow; three reads it all the same.
  texture.mapping = CubeUVReflectionMapping;
  texture.colorSpace = LinearSRGBColorSpace;
  texture.generateMipmaps = false;
  texture.name = "PMREM.cubeUv";
  texture.needsUpdate = true;
  return texture;
}

/** Fields of three's PMREMGenerator (0.186) that link its programs early. */
type GeneratorInternals = {
  _setSize?: (size: number) => void;
  _allocateTargets?: () => WebGLRenderTarget;
  _lodMeshes?: Mesh[];
  _cubemapMaterial?: Material | null;
  _ggxMaterial?: Material | null;
};

/**
 * Draws the panels into a cube map and filters it into a PMREM, as three
 * would on first use of a cube-mapped environment, but with the programs
 * linked in the background first: drawn straight away, they would be
 * linked on the main thread. Then reads the result back for other contexts.
 */
async function makeStudio(gl: WebGLRenderer, cancelled: () => boolean) {
  let share: (pixels: StudioPixels | null) => void = () => {};
  making = new Promise((resolve) => (share = resolve));
  const done = (pixels: StudioPixels | null) => {
    if (pixels) copy = pixels;
    making = null;
    share(pixels);
  };

  const studio = new Scene();
  const geometry = new PlaneGeometry(1, 1);
  for (const [color, strength, position, scale] of panels) {
    const panel = new Mesh(
      geometry,
      new MeshBasicMaterial({
        color: new Color(color).multiplyScalar(strength),
        toneMapped: false,
        side: DoubleSide,
      }),
    );
    panel.position.set(position[0], position[1], position[2]);
    panel.scale.set(scale[0], scale[1], 1);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
  }
  const cube = new WebGLCubeRenderTarget(cubeSize);
  cube.texture.type = HalfFloatType;
  const camera = new CubeCamera(0.1, 1000, cube);
  const generator = new PMREMGenerator(gl);
  const cleanUp = () => {
    cube.dispose();
    geometry.dispose();
    studio.traverse((object) => {
      if (object instanceof Mesh) object.material.dispose();
    });
    generator.dispose();
  };

  let target: WebGLRenderTarget | undefined;
  try {
    target = await linkStudio(gl, studio, camera, generator);
  } catch {
    // Linked on first use instead, as three would.
  }
  let pmrem: WebGLRenderTarget;
  try {
    if (cancelled()) throw new Error("released");
    const autoClear = gl.autoClear;
    gl.autoClear = true;
    camera.update(gl, studio);
    gl.autoClear = autoClear;
    pmrem = generator.fromCubemap(cube.texture, target ?? null);
  } catch {
    target?.dispose();
    cleanUp();
    done(null);
    return null;
  }
  cleanUp();
  void readBack(gl, pmrem).then(done, () => done(null));
  return { texture: pmrem.texture, dispose: () => pmrem.dispose() };
}

/**
 * Compiles the capture's program and the generator's two with
 * `compileAsync`, each with the target it draws into bound (the target
 * decides a program's output encoding and tone mapping), and resolves once
 * all three are linked. Returns the generator's output target, allocated
 * early so that its programs exist to be compiled.
 */
async function linkStudio(
  gl: WebGLRenderer,
  studio: Scene,
  camera: CubeCamera,
  generator: PMREMGenerator,
) {
  const internals = generator as unknown as GeneratorInternals;
  const previous = gl.getRenderTarget();
  const linking: Promise<unknown>[] = [];
  let target: WebGLRenderTarget | undefined;
  try {
    gl.setRenderTarget(camera.renderTarget);
    // The cube's six cameras differ only in where they look.
    linking.push(gl.compileAsync(studio, camera.children[0] as Camera));
    if (
      typeof internals._setSize === "function" &&
      typeof internals._allocateTargets === "function"
    ) {
      internals._setSize(cubeSize);
      target = internals._allocateTargets();
      gl.setRenderTarget(target);
      generator.compileCubemapShader();
      const flat = new OrthographicCamera();
      const planes =
        internals._lodMeshes?.[0]?.geometry ?? new BufferGeometry();
      for (const material of [
        internals._cubemapMaterial,
        internals._ggxMaterial,
      ])
        if (material)
          linking.push(gl.compileAsync(new Mesh(planes, material), flat));
    }
  } finally {
    gl.setRenderTarget(previous);
  }
  await Promise.all(linking);
  return target;
}

/**
 * Copies a half-float render target to the CPU without stalling: the GPU
 * writes it into a buffer, a fence says when, and the conversion runs a
 * slice per frame. RGBA/FLOAT is the read every float target allows; the
 * values were half floats, so converting them back is exact.
 */
async function readBack(
  gl: WebGLRenderer,
  target: WebGLRenderTarget,
): Promise<StudioPixels | null> {
  const context = gl.getContext();
  if (!("fenceSync" in context)) return null;
  const { width, height } = target;
  const size = width * height * 4;
  const buffer = context.createBuffer();
  const previous = gl.getRenderTarget();
  gl.setRenderTarget(target);
  context.bindBuffer(context.PIXEL_PACK_BUFFER, buffer);
  context.bufferData(context.PIXEL_PACK_BUFFER, size * 4, context.STREAM_READ);
  context.readPixels(0, 0, width, height, context.RGBA, context.FLOAT, 0);
  context.bindBuffer(context.PIXEL_PACK_BUFFER, null);
  gl.setRenderTarget(previous);
  const fence = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
  context.flush();
  const floats = new Float32Array(size);
  try {
    const start = performance.now();
    for (;;) {
      if (context.isContextLost() || performance.now() - start > 5000)
        return null;
      if (
        fence &&
        context.getSyncParameter(fence, context.SYNC_STATUS) ===
          context.SIGNALED
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    context.bindBuffer(context.PIXEL_PACK_BUFFER, buffer);
    context.getBufferSubData(context.PIXEL_PACK_BUFFER, 0, floats);
    context.bindBuffer(context.PIXEL_PACK_BUFFER, null);
  } finally {
    if (fence) context.deleteSync(fence);
    context.deleteBuffer(buffer);
  }
  return toHalves(floats, width, height);
}

/** Converts the read-back floats a slice per frame; null if nothing came. */
export async function toHalves(
  floats: Float32Array,
  width: number,
  height: number,
): Promise<StudioPixels | null> {
  const data = new Uint16Array(floats.length);
  const slice = frameSlices();
  // A failed read leaves the buffer as allocated, all zeros; every filtered
  // texel has an alpha of one.
  let written = false;
  for (let start = 0; start < floats.length; start += 8192) {
    await slice();
    const end = Math.min(start + 8192, floats.length);
    for (let i = start; i < end; i++) {
      data[i] = DataUtils.toHalfFloat(floats[i]);
      if (floats[i] !== 0) written = true;
    }
  }
  return written ? { data, width, height } : null;
}
