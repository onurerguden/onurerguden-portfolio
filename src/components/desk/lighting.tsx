import { memo, useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { lightStudio } from "./studio";

/**
 * One local reflection capture; no HDR download or continuous environment
 * rendering. Three unlit panels facing the desk are drawn once into a small
 * cube map that lights every material (the same capture drei's Environment
 * and Lightformer made, without their file loaders in the scene's code).
 * The page makes it once and shares it between its contexts (see studio.ts).
 * Memoised, so a scene re-rendering never repeats the capture.
 */
function DeskLighting() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  useLayoutEffect(() => lightStudio(gl, scene), [gl, scene]);
  return null;
}

export default memo(DeskLighting);
