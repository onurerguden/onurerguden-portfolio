import {
  Color,
  CompressedCubeTexture,
  CubeCamera,
  DataUtils,
  DoubleSide,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  RGBAFormat,
  Scene,
  WebGLCubeRenderTarget,
  type Camera,
  type CompressedPixelFormat,
  type Material,
  type Texture,
  type WebGLRenderer,
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

/**
 * A PMREM's faces on the CPU: every mip level, largest first, and within a
 * level the six faces in order, each `size >> level` texels square.
 */
export type StudioPixels = { data: Uint16Array; size: number; levels: number };

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

/** Values in one face of one mip level. */
const faceLength = (size: number, level: number) => (size >> level) ** 2 * 4;

/** Values in the whole copy. */
export const studioLength = (size: number, levels: number) => {
  let length = 0;
  for (let level = 0; level < levels; level++)
    length += 6 * faceLength(size, level);
  return length;
};

/**
 * The copy as a cube texture three samples exactly as it did the original.
 * three (0.187) takes a texture marked as a PMREM as it is, reading its
 * roughness from the mip levels; the compressed cube texture is the one
 * that carries its own chain for every face. The format is plain RGBA,
 * which that upload path accepts though the constructor's types do not.
 */
export function studioTexture({ data, size, levels }: StudioPixels) {
  const faces = Array.from({ length: 6 }, () => ({
    width: size,
    height: size,
    mipmaps: [] as { data: Uint16Array; width: number; height: number }[],
  }));
  let offset = 0;
  for (let level = 0; level < levels; level++) {
    const side = size >> level;
    const length = faceLength(size, level);
    for (const face of faces) {
      face.mipmaps.push({
        data: data.subarray(offset, offset + length),
        width: side,
        height: side,
      });
      offset += length;
    }
  }
  const texture = new CompressedCubeTexture(
    faces,
    RGBAFormat as unknown as CompressedPixelFormat,
    HalfFloatType,
  );
  texture.isPMREMTexture = true;
  texture.colorSpace = LinearSRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.name = "PMREM";
  texture.needsUpdate = true;
  return texture;
}

/** Fields of three's PMREMGenerator (0.187) that link its programs early. */
type GeneratorInternals = {
  _setSize?: (size: number) => void;
  _allocateTarget?: () => WebGLCubeRenderTarget;
  _getSourceTarget?: () => WebGLCubeRenderTarget;
  _applyPMREM?: (target: WebGLCubeRenderTarget) => void;
  _renderCube?: (...args: unknown[]) => void;
  _boxMesh?: Mesh;
  _cubeCamera?: CubeCamera;
  _cubemapMaterial?: Material | null;
  _ggxMaterial?: Material | null;
  _integrationMaterial?: Material | null;
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

  let target: WebGLCubeRenderTarget | undefined;
  try {
    target = await linkStudio(gl, studio, camera, generator);
  } catch {
    // Linked on first use instead, as three would.
  }
  let pmrem: WebGLCubeRenderTarget;
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
 * Compiles the capture's program and the generator's three with
 * `compileAsync`, each with the target it draws into bound (the target
 * decides a program's output encoding and tone mapping), and resolves once
 * all four are linked. Returns the generator's output target, allocated
 * early so that its programs exist to be compiled.
 *
 * The generator makes its filter materials the first time it filters, so
 * this runs that step once with drawing switched off: the materials then
 * exist, with nothing drawn, and the real filtering reuses them.
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
  let target: WebGLCubeRenderTarget | undefined;
  try {
    gl.setRenderTarget(camera.renderTarget);
    // The cube's six cameras differ only in where they look.
    linking.push(gl.compileAsync(studio, camera.children[0] as Camera));
    const {
      _setSize,
      _allocateTarget,
      _getSourceTarget,
      _applyPMREM,
      _renderCube,
      _boxMesh,
      _cubeCamera,
    } = internals;
    if (
      typeof _setSize === "function" &&
      typeof _allocateTarget === "function" &&
      typeof _getSourceTarget === "function" &&
      typeof _applyPMREM === "function" &&
      typeof _renderCube === "function" &&
      _boxMesh &&
      _cubeCamera
    ) {
      _setSize.call(generator, cubeSize);
      target = _allocateTarget.call(generator);
      _getSourceTarget.call(generator);
      internals._renderCube = () => {};
      try {
        _applyPMREM.call(generator, target);
      } finally {
        // Back to the prototype's.
        delete internals._renderCube;
      }
      generator.compileCubemapShader();
      gl.setRenderTarget(target);
      const view = _cubeCamera.children[0] as Camera;
      for (const material of [
        internals._cubemapMaterial,
        internals._ggxMaterial,
        internals._integrationMaterial,
      ])
        if (material)
          linking.push(
            gl.compileAsync(new Mesh(_boxMesh.geometry, material), view),
          );
    }
  } finally {
    gl.setRenderTarget(previous);
  }
  await Promise.all(linking);
  return target;
}

/**
 * Copies a half-float cube target, every face of every mip level, to the
 * CPU without stalling: the GPU writes it into a buffer, a fence says when,
 * and the conversion runs a slice per frame. RGBA/FLOAT is the read every
 * float target allows; the values were half floats, so converting them back
 * is exact.
 */
async function readBack(
  gl: WebGLRenderer,
  target: WebGLCubeRenderTarget,
): Promise<StudioPixels | null> {
  const context = gl.getContext();
  if (!("fenceSync" in context)) return null;
  const size = target.width;
  const levels = target.texture.mipmaps.length;
  const length = studioLength(size, levels);
  const buffer = context.createBuffer();
  const previous = gl.getRenderTarget();
  context.bindBuffer(context.PIXEL_PACK_BUFFER, buffer);
  context.bufferData(
    context.PIXEL_PACK_BUFFER,
    length * 4,
    context.STREAM_READ,
  );
  let offset = 0;
  for (let level = 0; level < levels; level++) {
    const side = size >> level;
    for (let face = 0; face < 6; face++) {
      gl.setRenderTarget(target, face, level);
      // setRenderTarget leaves the pack buffer bound.
      context.readPixels(
        0,
        0,
        side,
        side,
        context.RGBA,
        context.FLOAT,
        offset * 4,
      );
      offset += faceLength(size, level);
    }
  }
  context.bindBuffer(context.PIXEL_PACK_BUFFER, null);
  gl.setRenderTarget(previous);
  const fence = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
  context.flush();
  const floats = new Float32Array(length);
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
  return toHalves(floats, size, levels);
}

/**
 * Converts the read-back floats a slice per frame; null if nothing came.
 *
 * three samples a render target's cube as drawn, but mirrors an uploaded
 * cube's x axis (the convention of cube images). So each face is stored
 * mirrored left to right and the two x faces trade places: sampled through
 * that mirror, the copy gives back the very texels of the original.
 */
export async function toHalves(
  floats: Float32Array,
  size: number,
  levels: number,
): Promise<StudioPixels | null> {
  const data = new Uint16Array(floats.length);
  const slice = frameSlices();
  // A failed read leaves the buffer as allocated, all zeros; every filtered
  // texel has an alpha of one.
  let written = false;
  let offset = 0;
  for (let level = 0; level < levels; level++) {
    const side = size >> level;
    const length = faceLength(size, level);
    for (let face = 0; face < 6; face++) {
      const from = offset + face * length;
      const to = offset + (face < 2 ? 1 - face : face) * length;
      for (let y = 0; y < side; y++) {
        await slice();
        const row = y * side;
        for (let x = 0; x < side; x++) {
          const source = from + (row + x) * 4;
          const target = to + (row + side - 1 - x) * 4;
          for (let channel = 0; channel < 4; channel++) {
            const value = floats[source + channel];
            data[target + channel] = DataUtils.toHalfFloat(value);
            if (value !== 0) written = true;
          }
        }
      }
    }
    offset += 6 * length;
  }
  return written ? { data, size, levels } : null;
}
