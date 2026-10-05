"use client";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh } from "three";
import { deskModelSrc, deskDecoderPath } from "@/lib/desk-asset-urls";
import InteractionScene from "./interaction-scene";
import type { DeskInteractions } from "./interactions";

/**
 * The desk model with its interactive objects. Shared by the journey and the
 * lab review, kept apart from the review's styles so they never load with the
 * home page.
 */
export function Model({
  onReady,
  controls,
}: {
  onReady: () => void;
  controls: DeskInteractions;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const root = useThree((state) => state.scene);
  const { scene } = useGLTF(deskModelSrc, deskDecoderPath);
  // useGLTF caches the source. Each mounted view owns transforms and materials.
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.material = Array.isArray(object.material)
          ? object.material.map((m) => m.clone())
          : object.material.clone();
        object.castShadow = object.userData.interaction !== "lamp";
        object.receiveShadow = true;
        if (object.userData.interaction === "backdrop") object.visible = false;
      }
    });
    return clone;
  }, [scene]);
  useEffect(() => {
    // Compile every shader before the first visible frame, so the desk does
    // not stall on its first scroll; the poster covers the wait.
    let cancelled = false;
    const done = () => {
      if (cancelled) return;
      onReady();
      invalidate();
    };
    gl.compileAsync(root, camera).then(done, done);
    return () => {
      cancelled = true;
    };
  }, [onReady, invalidate, gl, camera, root]);
  useEffect(
    () => () => {
      model.traverse((object) => {
        if (object instanceof Mesh) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    },
    [model],
  );
  return <InteractionScene model={model} controls={controls} />;
}
