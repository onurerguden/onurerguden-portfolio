"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import SectionCanvas, { useStageWarm } from "@/components/three/section-canvas";
import DeskLighting from "@/components/desk/lighting";
import { warmUp } from "@/components/three/warm-up";
import { seededRandom } from "@/lib/random";
import techIcons from "@/lib/tech-icons.generated.json";
import { kick, restPose, swayAmplitude, turn } from "./about-motion";
import { curtainProgress } from "@/lib/desk-story/curtain";
import {
  basketball,
  braces,
  chip,
  clay,
  contactShadows,
  keycaps,
  placeShadow,
  showShadows,
  network,
  racket,
  tennisBall,
  terminal,
  useLogoGeometry,
} from "./about-objects";

type Slot = {
  /** Position as a share of the half viewport, before parallax. */
  x: number;
  y: number;
  z: number;
  scale: number;
};
/** An object's motion state; rotation sits on top of its rest pose. */
type Body = {
  slot: Slot;
  phase: number;
  speed: number;
  /** Rotation offset from the rest pose, and its angular velocity. */
  angle: Vector3;
  spin: Vector3;
  push: Vector3;
  velocity: Vector3;
};

/**
 * Where each object rests, around the copy: the side gutters and the bands
 * above the title and below the actions. Slots are in the z = 0 plane; an
 * object further back appears closer to the centre (camera at z = 8).
 */
const wideSlots: Record<string, Slot> = {
  basketball: { x: -0.88, y: 0.66, z: 0.2, scale: 0.46 },
  tennis: { x: 0.86, y: -0.5, z: 0.8, scale: 0.26 },
  racket: { x: 0.8, y: 0.34, z: -0.6, scale: 0.78 },
  terminal: { x: -0.87, y: -0.44, z: -0.3, scale: 0.68 },
  braces: { x: -0.59, y: 0.94, z: -1.4, scale: 0.4 },
  chip: { x: 0.74, y: 0.93, z: -1.3, scale: 0.46 },
  network: { x: -0.9, y: 0.06, z: -1.6, scale: 0.72 },
  keycaps: { x: 0.62, y: -0.72, z: 0.1, scale: 0.62 },
  "logo-0": { x: 0.93, y: 0.02, z: -0.9, scale: 0.46 },
  "logo-1": { x: -0.6, y: -0.74, z: 0.3, scale: 0.4 },
  "logo-2": { x: 0.41, y: -0.93, z: -1.2, scale: 0.3 },
};
/**
 * Narrow screens keep four small objects in the corners, inside the bands the
 * section's padding keeps free (see about.module.css).
 */
const narrowSlots: Record<string, Slot> = {
  basketball: { x: -0.8, y: 0.93, z: 0, scale: 0.2 },
  tennis: { x: 0.78, y: -0.94, z: 0.6, scale: 0.14 },
  chip: { x: 0.78, y: 0.93, z: -0.8, scale: 0.22 },
  "logo-0": { x: -0.78, y: -0.94, z: -0.4, scale: 0.24 },
};

type Groups = RefObject<Map<string, Group>>;

function Float({
  id,
  groups,
  children,
}: {
  id: string;
  groups: Groups;
  children: ReactNode;
}) {
  return (
    <group
      ref={(group) => {
        if (group) groups.current.set(id, group);
        else groups.current.delete(id);
      }}
    >
      {children}
    </group>
  );
}

function Logo({ path, color }: { path: string; color: string }) {
  const geometry = useLogoGeometry(path);
  const material = useMemo(() => clay(color), [color]);
  // SVG y points down; a half turn around x flips it without inverting faces.
  return (
    <mesh geometry={geometry} material={material} rotation={[Math.PI, 0, 0]} />
  );
}

function createBodies(slots: Record<string, Slot>) {
  const random = seededRandom(0xab0c7);
  return new Map<string, Body>(
    Object.keys(slots).map((id) => [
      id,
      {
        slot: slots[id],
        phase: random() * Math.PI * 2,
        speed: 0.25 + random() * 0.2,
        angle: new Vector3(),
        spin: new Vector3(),
        push: new Vector3(),
        velocity: new Vector3(),
      },
    ]),
  );
}

/**
 * Procedural geometry is built once per visit: a scene that is released and
 * mounted again (scrolling away and back) reuses it instead of rebuilding.
 */
let cachedParts: ReturnType<typeof buildParts> | null = null;
function buildParts() {
  return {
    basketball: basketball(),
    tennis: tennisBall(),
    racket: racket(),
    terminal: terminal(),
    braces: braces(),
    chip: chip(),
    network: network(),
    keycaps: keycaps(),
    shadows: contactShadows(Object.keys(wideSlots).length),
  };
}
const parts = () => (cachedParts ??= buildParts());

function Objects({
  logos,
  pointerRef,
  kickRef,
  sectionRef,
  arrival,
  onReady,
}: {
  logos: string[];
  pointerRef: RefObject<{ x: number; y: number; active: boolean }>;
  kickRef: RefObject<{ x: number; y: number } | null>;
  sectionRef: RefObject<HTMLElement | null>;
  /**
   * 0 to 1 as the page arrives; objects come in from beyond the sides. By
   * default it follows the desk's paper curtain.
   */
  arrival?: number;
  onReady: () => void;
}) {
  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const advance = useThree((state) => state.advance);
  const invalidate = useThree((state) => state.invalidate);
  // The layout follows the browser's view, not the section's shape.
  const [narrow, setNarrow] = useState(isNarrow);
  // Poster capture holds every object at its rest pose (see posterKey).
  const [still] = useState(isPosterCapture);
  const slots = narrow ? narrowSlots : wideSlots;
  const built = parts();
  const groups = useRef(new Map<string, Group>());
  // Simulation state lives in a ref: it changes every frame, never in render.
  const simulation = useRef<{
    key: Record<string, Slot>;
    bodies: Map<string, Body>;
    projected: Vector3;
  } | null>(null);
  // The section's place, read on scroll and resize rather than every frame.
  const placement = useRef({ top: 0, height: 1 });
  const readiness = useRef<"compiling" | "compiled" | "ready">("compiling");
  const warm = useStageWarm();
  // What the last frame was drawn for; see the end of the frame below.
  const drawn = useRef({ progress: NaN, spread: NaN });

  useEffect(() => {
    const measure = () => {
      setNarrow(isNarrow());
      const rect = sectionRef.current?.getBoundingClientRect();
      if (rect) placement.current = { top: rect.top, height: rect.height };
      // Scroll moves the objects; draw now rather than on the next tick.
      invalidate();
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [sectionRef, invalidate]);

  useEffect(() => {
    // Prepare every shader before the first frame, so the canvas never
    // fades in on a frame that stalled on compilation.
    let cancelled = false;
    const done = () => {
      if (cancelled) return;
      readiness.current = "compiled";
      warm();
      // Draw it now even when paused, so a paused visit still gets its still.
      advance(performance.now());
    };
    // Compiled, drawn once hidden and built by the GPU without blocking the
    // page (see warm-up.ts).
    warmUp({
      gl,
      scene,
      camera,
      render: () => advance(performance.now()),
      cancelled: () => cancelled,
    }).then(done, done);
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, advance, warm]);

  useFrame((state, delta) => {
    if (simulation.current?.key !== slots)
      simulation.current = {
        key: slots,
        bodies: createBodies(slots),
        projected: new Vector3(),
      };
    const { bodies, projected } = simulation.current;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    // Scroll depth: -1 as the section enters, +1 as it leaves.
    const { top, height } = placement.current;
    // Narrow sections are taller than the view; their objects drift less so
    // they stay in the corner bands.
    const progress = still
      ? 0
      : (((innerHeight - top) / (innerHeight + height)) * 2 - 1) *
        (narrow ? 0.25 : 1);
    const motion = still ? 0 : 1;
    const spread = 1 + 0.7 * (1 - (arrival ?? curtainProgress.get()));
    const hit = kickRef.current;
    let shadow = 0;
    for (const [id, body] of bodies) {
      const group = groups.current.get(id);
      if (!group) continue;
      const { slot } = body;
      const depth = 1 - slot.z * 0.35;
      group.position.set(
        (slot.x * spread * viewport.width) / 2,
        (slot.y * viewport.height) / 2 +
          Math.sin(t * body.speed + body.phase) * 0.08 * motion -
          progress * depth * 0.45,
        slot.z,
      );
      // Pointer repel in screen space with a critically damped return.
      projected.copy(group.position).project(camera);
      const px = (projected.x + 1) / 2;
      const py = (1 - projected.y) / 2;
      const p = pointerRef.current;
      if (p.active) {
        const dx = (px - p.x) * size.width;
        const dy = (py - p.y) * size.height;
        const distance = Math.hypot(dx, dy);
        const reach = 240 * slot.scale + 90;
        if (distance < reach && distance > 0.001) {
          const strength = (1 - distance / reach) * 26 * dt;
          body.velocity.x += (dx / distance) * strength;
          body.velocity.y -= (dy / distance) * strength;
        }
      }
      if (hit) {
        // A click turns an object away from the pointer: hit its left side
        // and it turns right, hit its top and it tips back.
        kick(
          body.spin,
          (px - hit.x) * size.width,
          (py - hit.y) * size.height,
          140 * slot.scale + 50,
        );
      }
      const stiffness = 26;
      const damping = 2 * Math.sqrt(stiffness);
      body.velocity.x +=
        (-stiffness * body.push.x - damping * body.velocity.x) * dt;
      body.velocity.y +=
        (-stiffness * body.push.y - damping * body.velocity.y) * dt;
      body.push.addScaledVector(body.velocity, dt);
      group.position.x += body.push.x;
      group.position.y += body.push.y;

      const { angle } = body;
      turn(id, angle, body.spin, dt);
      // A slow sway around the rest pose: about ±18° of yaw at most.
      const sway = t * body.speed + body.phase;
      const [restX, restY, restZ] = restPose[id] ?? [0, 0, 0];
      group.rotation.set(
        restX + swayAmplitude.pitch * motion * Math.sin(sway * 0.8) + angle.x,
        restY + swayAmplitude.yaw * motion * Math.sin(sway) + angle.y,
        restZ + swayAmplitude.roll * motion * Math.sin(sway * 1.3) + angle.z,
      );
      group.scale.setScalar(slot.scale);
      shadow = placeShadow(built.shadows, shadow, group, slot);
    }
    showShadows(built.shadows, shadow);
    // The stage ticks at 30 fps, enough for the idle sway (a few pixels a
    // second). Scrolling, the curtain, the pointer and a click's turn move
    // things faster, so while any of them is under way every frame is drawn.
    let lively =
      hit !== null ||
      Math.abs(progress - drawn.current.progress) > 1e-4 ||
      Math.abs(spread - drawn.current.spread) > 1e-4;
    for (const body of bodies.values())
      if (
        body.velocity.lengthSq() > 1e-6 ||
        body.push.lengthSq() > 1e-6 ||
        body.spin.lengthSq() > 1e-4
      )
        lively = true;
    drawn.current = { progress, spread };
    kickRef.current = null;
    if (lively) invalidate();
  });

  // Ready once the first compiled frame has been drawn, not before.
  useFrame(() => {
    if (readiness.current !== "compiled") return;
    readiness.current = "ready";
    onReady();
  }, 2);

  const icons = techIcons.icons as Record<
    string,
    { path: string; hex: string }
  >;
  return (
    <>
      <primitive object={built.shadows} />
      <Float id="basketball" groups={groups}>
        {/* Start in the classic three-quarter view, seen from a little above
            the equator, with the seams' crossing on the side the gutter shows. */}
        <mesh {...built.basketball} rotation={[0.24, 0.78, 0]} />
      </Float>
      <Float id="tennis" groups={groups}>
        <mesh {...built.tennis} />
      </Float>
      <Float id="chip" groups={groups}>
        <mesh geometry={built.chip.die} material={built.chip.dieMaterial} />
        <primitive object={built.chip.pins} />
        <mesh position={[0, 0, 0.081]} material={built.chip.labelMaterial}>
          <planeGeometry args={[0.62, 0.62]} />
        </mesh>
      </Float>
      {logos.slice(0, narrow ? 1 : 3).map((slug, i) =>
        icons[slug] ? (
          <Float id={`logo-${i}`} groups={groups} key={slug}>
            <Logo path={icons[slug].path} color={icons[slug].hex} />
          </Float>
        ) : null,
      )}
      {narrow ? null : (
        <>
          <Float id="racket" groups={groups}>
            <mesh
              geometry={built.racket.frame}
              material={built.racket.frameMaterial}
            />
            <mesh
              geometry={built.racket.handle}
              material={built.racket.handleMaterial}
            />
            <primitive object={built.racket.strings} />
          </Float>
          <Float id="terminal" groups={groups}>
            <mesh
              geometry={built.terminal.body}
              material={built.terminal.bodyMaterial}
            />
            <mesh
              position={[0, 0, 0.061]}
              material={built.terminal.screenMaterial}
            >
              <planeGeometry args={[1.22, 0.8]} />
            </mesh>
          </Float>
          <Float id="braces" groups={groups}>
            <mesh {...built.braces} />
          </Float>
          <Float id="network" groups={groups}>
            <primitive object={built.network.spheres} />
            <primitive object={built.network.links} />
          </Float>
          <Float id="keycaps" groups={groups}>
            {built.keycaps.legendMaterials.map((legend, i) => (
              <group
                key={i}
                position={[i * 0.56 - 0.28, i * -0.08, 0]}
                rotation={[0, 0, i * 0.18 - 0.09]}
              >
                <mesh
                  geometry={built.keycaps.geometry}
                  material={built.keycaps.capMaterial}
                />
                <mesh position={[0, 0, 0.121]} material={legend}>
                  <planeGeometry args={[0.34, 0.34]} />
                </mesh>
              </group>
            ))}
          </Float>
        </>
      )}
    </>
  );
}

/** Set by scripts/about/capture-poster.mjs only. */
export const posterKey = "portfolio:about-poster";
const isPosterCapture = () => {
  try {
    return localStorage.getItem(posterKey) === "1";
  } catch {
    return false;
  }
};
const isNarrow = () =>
  typeof window !== "undefined" &&
  (innerWidth < 760 || innerWidth / innerHeight < 0.9);

/**
 * The About scene: procedural objects that float in the side gutters, drift
 * with scroll depth, lean away from a fine pointer and turn when clicked,
 * always settling back to a pose whose labels read the right way.
 */
export default function AboutScene({
  active,
  paused,
  logos,
  sectionRef,
  arrival,
  onReady,
  onFailure,
}: {
  active: boolean;
  paused: boolean;
  logos: string[];
  sectionRef: RefObject<HTMLElement | null>;
  /** How far the page has arrived; follows the desk's paper curtain. */
  arrival?: number;
  onReady: () => void;
  onFailure: () => void;
}) {
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const kickRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || !active) return;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const toLocal = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerRef.current = { ...toLocal(event), active: true };
    };
    const leave = () => {
      pointerRef.current.active = false;
    };
    const down = (event: PointerEvent) => {
      // A paused scene ignores clicks rather than applying them on resume.
      if (paused) return;
      const target = event.target as Element;
      if (target.closest("a, button, [data-about-copy] p, h2")) return;
      kickRef.current = toLocal(event);
    };
    if (fine) {
      node.addEventListener("pointermove", move, { passive: true });
      node.addEventListener("pointerleave", leave, { passive: true });
    }
    node.addEventListener("pointerdown", down, { passive: true });
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      node.removeEventListener("pointerdown", down);
    };
  }, [sectionRef, active, paused]);
  return (
    <SectionCanvas
      warmUp
      id="about"
      active={active}
      paused={paused}
      onFailure={onFailure}
      fps={30}
      camera={{ position: [0, 0, 8], fov: 30, near: 0.1, far: 30 }}
    >
      <DeskLighting />
      <ambientLight intensity={0.35} color="#cad6ef" />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#fff4e6" />
      <directionalLight position={[4, -2, 3]} intensity={0.9} color="#9fb6ff" />
      <Objects
        logos={logos}
        pointerRef={pointerRef}
        kickRef={kickRef}
        sectionRef={sectionRef}
        arrival={arrival}
        onReady={onReady}
      />
    </SectionCanvas>
  );
}
