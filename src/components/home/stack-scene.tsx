"use client";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
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
import SectionCanvas from "@/components/three/section-canvas";
import DeskLighting from "@/components/desk/lighting";
import { createBallWorld, type BallWorld } from "@/lib/physics/ball-world";
import { floorInStage } from "@/lib/bliss-geometry";
import { buildAtlas, type BallItem } from "./tech-atlas";

export const tossEvent = "portfolio:toss-balls";
const GRAVITY = 2600;

type Mode = "idle" | "dropping" | "resting" | "launched";

/** The pinned part of the section, as scroll progress from `start end`. */
function pinnedRange(stage: number, track: number) {
  return [stage / (stage + track), track / (stage + track)] as const;
}

type Sim = {
  world: BallWorld;
  mode: Mode;
  lastProgress: number;
};

/**
 * Scroll state machine: drop in when the section arrives, launch out when it
 * is left downwards, drop again on the way back. Returns true on a change.
 */
function transition(state: Sim, track: HTMLElement) {
  const { world } = state;
  const rect = track.getBoundingClientRect();
  const progress = (innerHeight - rect.top) / (innerHeight + rect.height);
  const [start, end] = pinnedRange(innerHeight, rect.height);
  const down = progress >= state.lastProgress;
  state.lastProgress = progress;
  const before = state.mode;
  if (progress < start - 0.12) {
    if (state.mode !== "idle") {
      world.setGravity(GRAVITY);
      world.setWalls({ top: false });
      world.spawnAbove();
      state.mode = "idle";
    }
  } else if (state.mode === "idle") {
    world.spawnAbove();
    state.mode = "dropping";
  } else if (state.mode !== "launched" && down && progress > end + 0.01) {
    world.setWalls({ top: true });
    world.setGravity(-0.55 * GRAVITY);
    world.impulse(0, -1100 * (world.height / 900), 500);
    state.mode = "launched";
  } else if (state.mode === "launched" && progress < end - 0.02) {
    world.setWalls({ top: false });
    world.setGravity(GRAVITY);
    state.mode = "dropping";
  }
  return state.mode !== before;
}

function Balls({
  items,
  trackRef,
  stageRef,
  onReady,
}: {
  items: BallItem[];
  trackRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLElement | null>;
  onReady: () => void;
}) {
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const radius = Math.max(22, Math.min(44, size.width * 0.028));
  const radii = useMemo(
    () => items.map((item) => radius * (item.priority === 1 ? 1.08 : 0.94)),
    [items, radius],
  );
  const { geometry, material, atlas } = useMemo(() => {
    const { texture, grid } = buildAtlas(items);
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
          "#include <common>\nattribute float aLogo;\nvarying float vLogo;\nvarying vec3 vBallNormal;",
        )
        .replace(
          "#include <beginnormal_vertex>",
          "#include <beginnormal_vertex>\nvLogo = aLogo;\nvBallNormal = objectNormal;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform sampler2D uAtlas;\nuniform float uGrid;\nvarying float vLogo;\nvarying vec3 vBallNormal;",
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
        );
    };
    const sphere = new SphereGeometry(1, 40, 28);
    sphere.setAttribute(
      "aLogo",
      new InstancedBufferAttribute(
        Float32Array.from(items, (_, i) => i),
        1,
      ),
    );
    return { geometry: sphere, material: ballMaterial, atlas: texture };
  }, [items]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      atlas.dispose();
    },
    [geometry, material, atlas],
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

  // Everything that changes per frame lives in one ref.
  const sim = useRef<{
    world: BallWorld;
    mode: Mode;
    width: number;
    height: number;
    lastProgress: number;
    pointer: { x: number; y: number; vx: number; vy: number; t: number } | null;
    kick: { x: number; y: number } | null;
    toss: boolean;
    matrix: Matrix4;
    scale: Vector3;
    position: Vector3;
    rotation: Quaternion;
  } | null>(null);

  const place = () => {
    const state = sim.current;
    const mesh = meshRef.current;
    if (!state || !mesh) return;
    const { world, matrix, scale, position, rotation } = state;
    for (let i = 0; i < world.count; i++) {
      position.set(
        world.px[i] - state.width / 2,
        state.height / 2 - world.py[i],
        0,
      );
      rotation.fromArray(world.q, i * 4);
      scale.setScalar(world.radii[i]);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => {
    const state = sim.current;
    if (state && state.width === size.width && state.height === size.height)
      return;
    const floor = floorInStage(size.width, size.height);
    if (state) {
      state.world.resize(size.width, size.height);
      state.world.setFloor(floor);
      state.width = size.width;
      state.height = size.height;
    } else {
      const world = createBallWorld({
        width: size.width,
        height: size.height,
        radii,
        seed: 0x7ec5,
        gravity: GRAVITY,
      });
      world.setFloor(floor);
      // Parked above the stage until the section is reached.
      world.spawnAbove();
      sim.current = {
        world,
        mode: "idle",
        width: size.width,
        height: size.height,
        lastProgress: 0,
        pointer: null,
        kick: null,
        toss: false,
        matrix: new Matrix4(),
        scale: new Vector3(),
        position: new Vector3(),
        rotation: new Quaternion(),
      };
    }
    invalidate();
  }, [size.width, size.height, radii, invalidate]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(frame);
  }, [onReady]);

  // Pointer, taps and the dialog's toss button.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let down: { x: number; y: number; t: number } | null = null;
    const local = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const ignored = (event: Event) =>
      (event.target as Element).closest("a, button, [data-no-physics]");
    const move = (event: PointerEvent) => {
      const state = sim.current;
      if (!state || event.pointerType === "touch") return;
      const { x, y } = local(event);
      const inside = x >= 0 && y >= 0 && x <= state.width && y <= state.height;
      if (!inside || ignored(event)) {
        state.pointer = null;
        return;
      }
      const now = performance.now();
      const last = state.pointer;
      const dt = last ? Math.max(8, now - last.t) / 1000 : 1;
      state.pointer = {
        x,
        y,
        vx: last ? (x - last.x) / dt : 0,
        vy: last ? (y - last.y) / dt : 0,
        t: now,
      };
      invalidate();
    };
    const press = (event: PointerEvent) => {
      if (ignored(event)) return;
      down = { ...local(event), t: performance.now() };
    };
    const release = (event: PointerEvent) => {
      const state = sim.current;
      if (!state || !down) return;
      const { x, y } = local(event);
      if (
        performance.now() - down.t < 250 &&
        Math.hypot(x - down.x, y - down.y) < 10
      ) {
        state.kick = { x, y };
        invalidate();
      }
      down = null;
    };
    const toss = () => {
      if (sim.current) sim.current.toss = true;
      invalidate();
    };
    window.addEventListener("pointermove", move, { passive: true });
    stage.addEventListener("pointerdown", press, { passive: true });
    stage.addEventListener("pointerup", release, { passive: true });
    window.addEventListener(tossEvent, toss);
    return () => {
      window.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerdown", press);
      stage.removeEventListener("pointerup", release);
      window.removeEventListener(tossEvent, toss);
    };
  }, [stageRef, invalidate]);

  // A settled pile renders nothing, so scrolling itself drives transitions.
  useEffect(() => {
    const onScroll = () => {
      const state = sim.current;
      const track = trackRef.current;
      if (state && track && transition(state, track)) invalidate();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [trackRef, invalidate]);

  useFrame((_, delta) => {
    const state = sim.current;
    const track = trackRef.current;
    if (!state || !track) return;
    const { world } = state;
    transition(state, track);
    if (state.toss) {
      state.toss = false;
      world.impulse(0, -1500 * (state.height / 900), 700, 10);
    }
    if (state.kick) {
      world.kick(state.kick.x, state.kick.y, 900);
      state.kick = null;
    }
    const pointer = state.pointer;
    const pointerFresh = pointer && performance.now() - pointer.t < 120;
    world.setPointer(
      pointerFresh
        ? { ...pointer, r: Math.max(40, Math.min(80, state.width * 0.05)) }
        : null,
    );

    if (state.mode !== "idle") {
      const { settled } = world.advance(delta);
      if (settled && state.mode === "dropping") state.mode = "resting";
      if (!settled || pointerFresh) invalidate();
    }
    place();
    gl.domElement.setAttribute("data-physics-mode", state.mode);
    gl.domElement.setAttribute("data-physics-settled", String(world.settled()));
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, items.length]}
      frustumCulled={false}
    />
  );
}

/** The tech-stack balls between the Bliss hill and its foreground. */
export default function StackScene({
  items,
  active,
  paused,
  trackRef,
  stageRef,
  onReady,
  onFailure,
}: {
  items: BallItem[];
  active: boolean;
  paused: boolean;
  trackRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLElement | null>;
  onReady: () => void;
  onFailure: () => void;
}) {
  return (
    <SectionCanvas
      id="stack"
      active={active}
      paused={paused}
      onFailure={onFailure}
      orthographic
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
      <Balls
        items={items}
        trackRef={trackRef}
        stageRef={stageRef}
        onReady={onReady}
      />
    </SectionCanvas>
  );
}
