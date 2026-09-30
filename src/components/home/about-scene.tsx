"use client";
import {
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import SectionCanvas from "@/components/three/section-canvas";
import DeskLighting from "@/components/desk/lighting";
import { seededRandom } from "@/lib/random";
import techIcons from "@/lib/tech-icons.generated.json";
import {
  basketball,
  braces,
  chip,
  clay,
  keycaps,
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
type Body = {
  slot: Slot;
  phase: number;
  speed: number;
  spin: Vector3;
  push: Vector3;
  velocity: Vector3;
};

/** Where each object rests: the side gutters, away from the copy. */
const wideSlots: Record<string, Slot> = {
  basketball: { x: -0.88, y: 0.66, z: 0.2, scale: 0.46 },
  tennis: { x: 0.86, y: -0.5, z: 0.8, scale: 0.26 },
  racket: { x: 0.8, y: 0.34, z: -0.6, scale: 0.78 },
  terminal: { x: -0.8, y: -0.4, z: -0.3, scale: 0.72 },
  braces: { x: -0.42, y: 0.92, z: -1.4, scale: 0.42 },
  chip: { x: 0.5, y: 0.9, z: -1.3, scale: 0.5 },
  network: { x: -0.9, y: 0.06, z: -1.6, scale: 0.72 },
  keycaps: { x: 0.62, y: -0.72, z: 0.1, scale: 0.62 },
  "logo-0": { x: 0.93, y: 0.02, z: -0.9, scale: 0.46 },
  "logo-1": { x: -0.6, y: -0.74, z: 0.3, scale: 0.4 },
  "logo-2": { x: 0.34, y: -0.78, z: -1.2, scale: 0.36 },
};
/** Narrow screens keep a few objects in the corners. */
const narrowSlots: Record<string, Slot> = {
  basketball: { x: -0.86, y: 0.9, z: 0, scale: 0.42 },
  tennis: { x: 0.8, y: -0.9, z: 0.6, scale: 0.22 },
  chip: { x: 0.78, y: 0.9, z: -0.8, scale: 0.38 },
  "logo-0": { x: -0.78, y: -0.92, z: -0.4, scale: 0.34 },
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
        speed: 0.35 + random() * 0.3,
        spin: new Vector3(
          (random() - 0.5) * 0.25,
          (random() - 0.5) * 0.35,
          (random() - 0.5) * 0.12,
        ),
        push: new Vector3(),
        velocity: new Vector3(),
      },
    ]),
  );
}

function Objects({
  logos,
  pointerRef,
  kickRef,
  sectionRef,
  onReady,
}: {
  logos: string[];
  pointerRef: RefObject<{ x: number; y: number; active: boolean }>;
  kickRef: RefObject<{ x: number; y: number } | null>;
  sectionRef: RefObject<HTMLElement | null>;
  onReady: () => void;
}) {
  const { viewport, size, camera } = useThree();
  const narrow = size.width < 760 || size.width / size.height < 0.9;
  const slots = narrow ? narrowSlots : wideSlots;
  const parts = useMemo(
    () => ({
      basketball: basketball(),
      tennis: tennisBall(),
      racket: racket(),
      terminal: terminal(),
      braces: braces(),
      chip: chip(),
      network: network(),
      keycaps: keycaps(),
    }),
    [],
  );
  const groups = useRef(new Map<string, Group>());
  // Simulation state lives in a ref: it changes every frame, never in render.
  const simulation = useRef<{
    key: Record<string, Slot>;
    bodies: Map<string, Body>;
    projected: Vector3;
  } | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(frame);
  }, [onReady]);

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
    const rect = sectionRef.current?.getBoundingClientRect();
    const progress = rect
      ? ((innerHeight - rect.top) / (innerHeight + rect.height)) * 2 - 1
      : 0;
    for (const [id, body] of bodies) {
      const group = groups.current.get(id);
      if (!group) continue;
      const { slot } = body;
      const depth = 1 - slot.z * 0.35;
      group.position.set(
        (slot.x * viewport.width) / 2,
        (slot.y * viewport.height) / 2 +
          Math.sin(t * body.speed + body.phase) * 0.08 -
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
      const hit = kickRef.current;
      if (hit) {
        const distance = Math.hypot(
          (px - hit.x) * size.width,
          (py - hit.y) * size.height,
        );
        if (distance < 140 * slot.scale + 50) {
          body.spin.x += (Math.random() - 0.5) * 9;
          body.spin.y += (Math.random() - 0.5) * 9;
        }
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
      // Spin decays back to a slow drift.
      body.spin.multiplyScalar(1 - Math.min(1, 1.4 * dt));
      group.rotation.x += (body.spin.x + 0.06 * Math.sin(body.phase)) * dt;
      group.rotation.y += (body.spin.y + 0.1) * dt;
      group.rotation.z += body.spin.z * dt * 0.5;
      group.scale.setScalar(slot.scale);
      if (id === "racket") group.rotation.z = -0.5 + Math.sin(t * 0.3) * 0.12;
    }
    kickRef.current = null;
  });

  const icons = techIcons.icons as Record<
    string,
    { path: string; hex: string }
  >;
  return (
    <>
      <Float id="basketball" groups={groups}>
        <mesh {...parts.basketball} />
      </Float>
      <Float id="tennis" groups={groups}>
        <mesh {...parts.tennis} />
      </Float>
      <Float id="chip" groups={groups}>
        <mesh geometry={parts.chip.die} material={parts.chip.dieMaterial} />
        <primitive object={parts.chip.pins} />
        <mesh position={[0, 0, 0.081]} material={parts.chip.labelMaterial}>
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
              geometry={parts.racket.frame}
              material={parts.racket.frameMaterial}
            />
            <mesh
              geometry={parts.racket.handle}
              material={parts.racket.handleMaterial}
            />
            <primitive object={parts.racket.strings} />
          </Float>
          <Float id="terminal" groups={groups}>
            <mesh
              geometry={parts.terminal.body}
              material={parts.terminal.bodyMaterial}
            />
            <mesh
              position={[0, 0, 0.061]}
              material={parts.terminal.screenMaterial}
            >
              <planeGeometry args={[1.22, 0.8]} />
            </mesh>
          </Float>
          <Float id="braces" groups={groups}>
            <mesh {...parts.braces} />
          </Float>
          <Float id="network" groups={groups}>
            <primitive object={parts.network.spheres} />
            <primitive object={parts.network.links} />
          </Float>
          <Float id="keycaps" groups={groups}>
            {parts.keycaps.legendMaterials.map((legend, i) => (
              <group
                key={i}
                position={[i * 0.56 - 0.28, i * -0.08, 0]}
                rotation={[0, 0, i * 0.18 - 0.09]}
              >
                <mesh
                  geometry={parts.keycaps.geometry}
                  material={parts.keycaps.capMaterial}
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

/**
 * The About scene: procedural objects that float in the side gutters, drift
 * with scroll depth, lean away from a fine pointer and spin when clicked.
 */
export default function AboutScene({
  active,
  paused,
  logos,
  sectionRef,
  onReady,
  onFailure,
}: {
  active: boolean;
  paused: boolean;
  logos: string[];
  sectionRef: RefObject<HTMLElement | null>;
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
  }, [sectionRef, active]);
  return (
    <SectionCanvas
      id="about"
      active={active}
      paused={paused}
      onFailure={onFailure}
      fps={60}
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
        onReady={onReady}
      />
    </SectionCanvas>
  );
}
