"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import SectionCanvas, { useStageWarm } from "@/components/three/section-canvas";
import DeskLighting from "@/components/desk/lighting";
import { warmUp } from "@/components/three/warm-up";
import { floorInStage } from "@/lib/bliss-geometry";
import { buildAtlas, type BallItem } from "./tech-atlas";
import { applyPhase, resetWorld, sim } from "./xp-sim";
import type { LaptopPhase } from "@/lib/desk-story/store";

/** Grows a selected ball by this much, over a few frames. */
const SELECTED_SCALE = 1.12;

function Balls({
  items,
  phase,
  onReady,
}: {
  items: BallItem[];
  phase: LaptopPhase;
  onReady: () => void;
}) {
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const narrow = size.width < 700;
  const radius = Math.max(22, Math.min(44, size.width * 0.028));
  const radii = useMemo(
    () => items.map((item) => radius * (item.priority === 1 ? 1.08 : 0.94)),
    [items, radius],
  );
  const { geometry, material, atlas, painted, stopPainting } = useMemo(() => {
    const { texture, grid, ready, stop } = buildAtlas(items);
    const ballMaterial = new MeshPhysicalMaterial({
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });
    ballMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uAtlas = { value: texture };
      shader.uniforms.uGrid = { value: grid };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute float aLogo;\nattribute float aSelected;\nvarying float vLogo;\nvarying float vSelected;\nvarying vec3 vBallNormal;",
        )
        .replace(
          "#include <beginnormal_vertex>",
          "#include <beginnormal_vertex>\nvLogo = aLogo;\nvSelected = aSelected;\nvBallNormal = objectNormal;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform sampler2D uAtlas;\nuniform float uGrid;\nvarying float vLogo;\nvarying float vSelected;\nvarying vec3 vBallNormal;",
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          // The logo sits on both hemispheres, mirrored so it reads from behind.
          vec3 ballNormal = normalize(vBallNormal);
          vec2 face = ballNormal.z >= 0.0 ? ballNormal.xy : vec2(-ballNormal.x, ballNormal.y);
          vec2 local = face * 0.92 + 0.5;
          if (abs(ballNormal.z) > 0.3 && all(greaterThanEqual(local, vec2(0.0))) && all(lessThanEqual(local, vec2(1.0)))) {
            vec2 cell = vec2(mod(vLogo, uGrid), floor(vLogo / uGrid));
            vec4 logo = texture2D(uAtlas, (cell + vec2(local.x, 1.0 - local.y)) / uGrid);
            diffuseColor.rgb = mix(diffuseColor.rgb, logo.rgb, logo.a);
          }`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          // A volt rim marks the selected ball.
          float rim = pow(1.0 - abs(normalize(vNormal).z), 2.0);
          totalEmissiveRadiance += vec3(0.85, 0.95, 0.24) * rim * vSelected * 1.4;`,
        );
    };
    // Fewer segments than a hero object: the balls are small on the screen.
    const sphere = narrow
      ? new SphereGeometry(1, 16, 12)
      : new SphereGeometry(1, 24, 16);
    sphere.setAttribute(
      "aLogo",
      new InstancedBufferAttribute(
        Float32Array.from(items, (_, i) => i),
        1,
      ),
    );
    sphere.setAttribute(
      "aSelected",
      new InstancedBufferAttribute(new Float32Array(items.length), 1),
    );
    return {
      geometry: sphere,
      material: ballMaterial,
      atlas: texture,
      painted: ready,
      stopPainting: stop,
    };
  }, [items, narrow]);
  useEffect(
    () => () => {
      stopPainting();
      geometry.dispose();
      material.dispose();
      atlas.dispose();
    },
    [geometry, material, atlas, stopPainting],
  );
  const meshRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const white = new Color("#f7f8fa");
    const volt = new Color("#d8f23c");
    items.forEach((item, i) =>
      mesh.setColorAt(i, item.ball === "yellow" ? volt : white),
    );
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);

  // Per-frame scratch values, reused so frames allocate nothing.
  const scratch = useRef({
    matrix: new Matrix4(),
    scale: new Vector3(),
    position: new Vector3(),
    rotation: new Quaternion(),
    grow: new Float32Array(64).fill(1),
  });

  // The world outlives this canvas; only a new desktop size or ball set
  // replaces it.
  useEffect(() => {
    const same =
      sim.world &&
      sim.radii.length === radii.length &&
      sim.radii.every((r, i) => r === radii[i]);
    if (!same) resetWorld(radii, size.width, size.height);
    else if (sim.width !== size.width || sim.height !== size.height) {
      sim.world!.resize(size.width, size.height);
      sim.world!.setFloor(floorInStage(size.width, size.height));
      sim.width = size.width;
      sim.height = size.height;
    }
    sim.invalidate = invalidate;
    applyPhase(phase);
    invalidate();
  }, [radii, size.width, size.height, invalidate, phase]);
  useEffect(
    () => () => {
      sim.invalidate = () => {};
    },
    [],
  );

  // The clearcoat shader and the logo atlas are ready before the first ball
  // is drawn (see warm-up.ts); prepared on first draw, they would freeze the
  // drop's opening frames. The balls wait above the screen. The atlas is
  // painted first, so its upload is the finished one.
  const [compiled, setCompiled] = useState(false);
  const warm = useStageWarm();
  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (cancelled) return;
      setCompiled(true);
      warm();
      invalidate();
    };
    void painted.then((complete) => {
      if (!complete || cancelled) return;
      warmUp({
        gl,
        scene,
        camera,
        render: () => gl.render(scene, camera),
        cancelled: () => cancelled,
      }).then(done, done);
    });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, material, painted, invalidate, warm]);

  useEffect(() => {
    if (!compiled) return;
    const frame = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(frame);
  }, [compiled, onReady]);

  useFrame((_, delta) => {
    if (!compiled) return;
    const world = sim.world;
    const mesh = meshRef.current;
    if (!world || !mesh || world.count !== items.length) return;
    let moving = false;
    if (sim.mode === "dropping" || sim.mode === "launched") {
      const { settled } = world.advance(delta);
      if (settled && sim.mode === "dropping") sim.mode = "resting";
      moving = !settled;
      // Launched balls are gone once all of them are above the screen.
      if (sim.mode === "launched") {
        let visible = false;
        for (let i = 0; i < world.count; i++)
          if (world.py[i] > -world.radii[i] * 2) visible = true;
        moving = visible;
      }
    }
    const { matrix, scale, position, rotation, grow } = scratch.current;
    const selection = mesh.geometry.getAttribute(
      "aSelected",
    ) as InstancedBufferAttribute;
    const step = 1 - Math.exp(-14 * Math.min(delta, 0.1));
    const selected =
      world.draggedIndex >= 0 ? world.draggedIndex : sim.selected;
    for (let i = 0; i < world.count; i++) {
      const target = selected === i ? SELECTED_SCALE : 1;
      grow[i] += (target - grow[i]) * step;
      if (Math.abs(target - grow[i]) < 0.002) grow[i] = target;
      else moving = true;
      selection.setX(i, selected === i ? 1 : 0);
      position.set(
        world.px[i] - size.width / 2,
        size.height / 2 - world.py[i],
        0,
      );
      rotation.fromArray(world.q, i * 4);
      scale.setScalar(world.radii[i] * grow[i]);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(i, matrix);
    }
    selection.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    if (moving) invalidate();
    gl.domElement.setAttribute("data-physics-mode", sim.mode);
    gl.domElement.setAttribute("data-physics-settled", String(world.settled()));
    gl.domElement.setAttribute("data-selected", String(selected));
    gl.domElement.setAttribute("data-dragged", String(world.draggedIndex));
    if (selected >= 0) {
      gl.domElement.setAttribute("data-selected-x", String(world.px[selected]));
      gl.domElement.setAttribute("data-selected-y", String(world.py[selected]));
    } else {
      gl.domElement.removeAttribute("data-selected-x");
      gl.domElement.removeAttribute("data-selected-y");
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, items.length]}
      frustumCulled={false}
      visible={compiled}
    />
  );
}

/** The technology balls between the Bliss hill and its foreground. */
export default function XpScene({
  items,
  phase,
  active,
  paused,
  onReady,
  onFailure,
}: {
  items: BallItem[];
  phase: LaptopPhase;
  active: boolean;
  paused: boolean;
  onReady: () => void;
  onFailure: () => void;
}) {
  return (
    <SectionCanvas
      warmUp
      id="desk-stack"
      active={active}
      paused={paused}
      onFailure={onFailure}
      orthographic
      // The canvas sits inside a projected panel: size it by its own layout
      // box, not by the perspective-distorted bounding box.
      resize={{ offsetSize: true, scroll: false }}
      camera={{ position: [0, 0, 500], near: 1, far: 1000, zoom: 1 }}
    >
      <DeskLighting />
      <ambientLight intensity={0.55} color="#dbe8ff" />
      <directionalLight
        position={[-300, 500, 600]}
        intensity={2.4}
        color="#fff6e8"
      />
      <directionalLight
        position={[400, -200, 300]}
        intensity={0.7}
        color="#bcd4ff"
      />
      <Balls items={items} phase={phase} onReady={onReady} />
    </SectionCanvas>
  );
}
