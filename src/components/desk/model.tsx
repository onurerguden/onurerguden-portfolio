"use client";
import { useEffect, useMemo } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { BackSide, DoubleSide, FrontSide, Mesh, type Material } from "three";
import { deskModelSrc, deskDecoderPath } from "@/lib/desk-asset-urls";
import InteractionScene, { actionFor } from "./interaction-scene";
import { warmUp } from "@/components/three/warm-up";
import { reportLoad } from "@/lib/desk-story/load-progress";
import { createOccluders } from "@/lib/ray-occluders";
import type { DeskInteractions } from "./interactions";

const skipRaycast = () => {};

/**
 * three draws a transparent, double-sided material in two passes, back faces
 * and then front, and flags the material for a new program before each:
 * every frame it looked the program up twice and uploaded all of the
 * material's uniforms again (the desk's expanded steel mesh; November 15
 * final revisions). Two meshes, back faces first, draw the same picture with
 * the same programs and none of that work: transparent objects at one depth
 * draw in the order they were made, and the front faces are made second.
 */
export function splitSides(mesh: Mesh) {
  const material = mesh.material as Material;
  if (
    Array.isArray(mesh.material) ||
    !material.transparent ||
    material.side !== DoubleSide ||
    material.forceSinglePass
  )
    return null;
  const front = new Mesh(mesh.geometry, material.clone());
  (front.material as Material).side = FrontSide;
  material.side = BackSide;
  // Both sides' shadow, cast once, as the double-sided material cast it.
  material.shadowSide = DoubleSide;
  front.castShadow = false;
  front.receiveShadow = mesh.receiveShadow;
  front.renderOrder = mesh.renderOrder;
  front.raycast = skipRaycast;
  front.name = `${mesh.name} (front faces)`;
  mesh.add(front);
  return front;
}

// One decoder for every load: its workers outlive a released scene.
let draco: DRACOLoader | null = null;
function withDraco(loader: GLTFLoader) {
  draco ??= new DRACOLoader().setDecoderPath(deskDecoderPath);
  loader.setDRACOLoader(draco);
}

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
  const { scene } = useLoader(GLTFLoader, deskModelSrc, withDraco);
  // useGLTF caches the source. Each mounted view owns transforms and materials.
  const { model, occluders } = useMemo(() => {
    const clone = scene.clone(true);
    const still: Mesh[] = [];
    const meshes: Mesh[] = [];
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.material = Array.isArray(object.material)
          ? object.material.map((m) => m.clone())
          : object.material.clone();
        object.castShadow = object.userData.interaction !== "lamp";
        object.receiveShadow = true;
        if (object.userData.interaction === "backdrop") object.visible = false;
        // The pointer looks for objects that do something (and for the
        // interaction targets, outside the model). The rest, the static
        // batches above all, hold half the desk's triangles and span all of
        // it: raycasting them made every pointer move cost a millisecond.
        // They still hide what is behind them; see InteractionScene.
        if (!actionFor(object)) {
          object.raycast = skipRaycast;
          still.push(object);
        }
        meshes.push(object);
      }
    });
    // After the traversal: splitting adds meshes to the tree.
    for (const mesh of meshes) splitSides(mesh);
    return { model: clone, occluders: createOccluders(still) };
  }, [scene]);
  // Mounted means downloaded and decoded (useLoader suspends until then).
  useEffect(() => reportLoad("model"), []);
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
      onStep: reportLoad,
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
  return (
    <InteractionScene model={model} occluders={occluders} controls={controls} />
  );
}
