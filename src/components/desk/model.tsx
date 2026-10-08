"use client";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh } from "three";
import { deskModelSrc, deskDecoderPath } from "@/lib/desk-asset-urls";
import InteractionScene from "./interaction-scene";
import { warmUp } from "@/components/three/warm-up";
import type { DeskInteractions } from "./interactions";

/**
 * The desk model with its interactive objects. Shared by the journey and the
 * lab review, kept apart from the review's styles so they never load with the
 * home page.
 */
export function Model({
  onReady,
  controls,
  offscreen = false,
}: {
  onReady: () => void;
  controls: DeskInteractions;
  /** The scene is also drawn into a render target (a reflection). */
  offscreen?: boolean;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const advance = useThree((state) => state.advance);
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
    // Compile every shader, upload every texture and draw one hidden frame
    // before the desk shows, without blocking the page: the canvas draws
    // nothing until then (its frame loop waits for onReady) and the opening
    // poster covers the wait.
    let cancelled = false;
    const done = () => {
      if (cancelled) return;
      onReady();
      invalidate();
    };
    warmUp({
      gl,
      scene: root,
      camera,
      render: () => advance(performance.now()),
      cancelled: () => cancelled,
      offscreen,
    }).then((warm) => warm && done(), done);
    return () => {
      cancelled = true;
    };
  }, [onReady, invalidate, advance, gl, camera, root, offscreen]);
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
