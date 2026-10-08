import { memo, useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
  Color,
  CubeCamera,
  DoubleSide,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  WebGLCubeRenderTarget,
  type WebGLRenderer,
} from "three";

/** Three soft panels around the desk, as [color, intensity, position, scale]. */
const panels = [
  ["#fff3df", 3, [-2, 2, 1], [1.5, 3]],
  ["#dce8ff", 1.5, [2, 1, 0], [1, 2]],
  ["#ffe6cf", 1, [0, 3, -1], [3, 1]],
] as const;

/** Draws the panels into a cube map and makes it the scene's environment. */
function captureStudio(gl: WebGLRenderer, scene: Scene) {
  const studio = new Scene();
  const geometry = new PlaneGeometry(1, 1);
  for (const [color, intensity, position, scale] of panels) {
    const panel = new Mesh(
      geometry,
      new MeshBasicMaterial({
        color: new Color(color).multiplyScalar(intensity),
        toneMapped: false,
        side: DoubleSide,
      }),
    );
    panel.position.set(position[0], position[1], position[2]);
    panel.scale.set(scale[0], scale[1], 1);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
  }
  const target = new WebGLCubeRenderTarget(128);
  target.texture.type = HalfFloatType;
  const camera = new CubeCamera(0.1, 1000, target);
  const autoClear = gl.autoClear;
  gl.autoClear = true;
  camera.update(gl, studio);
  gl.autoClear = autoClear;
  const previous = {
    environment: scene.environment,
    intensity: scene.environmentIntensity,
  };
  scene.environment = target.texture;
  scene.environmentIntensity = 0.55;
  return () => {
    scene.environment = previous.environment;
    scene.environmentIntensity = previous.intensity;
    target.dispose();
    geometry.dispose();
    studio.traverse((object) => {
      if (object instanceof Mesh) object.material.dispose();
    });
  };
}

/**
 * One local reflection capture; no HDR download or continuous environment
 * rendering. Three unlit panels facing the desk are drawn once into a small
 * cube map that lights every material (the same capture drei's Environment
 * and Lightformer made, without their file loaders in the scene's code).
 * Memoised, so a scene re-rendering never repeats the capture.
 */
function DeskLighting() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  useLayoutEffect(() => captureStudio(gl, scene), [gl, scene]);
  return null;
}

export default memo(DeskLighting);
