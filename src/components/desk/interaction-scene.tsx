"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { quality } from "@/lib/quality";
import { qa } from "@/lib/qa";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Color,
  CanvasTexture,
  AdditiveBlending,
  Sprite,
  SpriteMaterial,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Quaternion,
  SpotLight,
  Vector3,
  type WebGLRenderer,
} from "three";
import contract from "@/lib/desk-interactions.json";
import type { Occluders } from "@/lib/ray-occluders";
import {
  accessoryPose,
  drawerIds,
  drawerOffset,
  drawerPeek,
  drawerPress,
  drawerPressOffset,
  drawerWave,
  animationDuration,
  hopPose,
  hoverDuration,
  hoverLevel,
  hoverLift,
  lampColors,
  lampNod,
  initialLampColor,
  pressDepth,
  pressDuration,
  pressLead,
  pressScale,
  rippleDelay,
  rippleDuration,
  squashPivot,
  tabletDip,
  teaseDim,
  teaseDuration,
  teaseLift,
  teasePeek,
  type AnimatedObject,
  type PosedObject,
} from "@/lib/desk-interaction-motion";
import type {
  DeskAction,
  DeskInteractions,
  InteractionPoint,
} from "./interactions";

const actions = new Set<string>([
  "dial",
  "headphones",
  "lamp",
  "mouse",
  "tablet",
  "drawers",
]);
const animated = ["headphones", "mouse", "tablet"] as const;
/** Which drawer a point on the cabinet is nearest. */
const drawerAt = (y: number) => {
  let nearest = 0;
  drawerIds.forEach((id, index) => {
    if (
      Math.abs(contract.objects[id].pivot[1] - y) <
      Math.abs(contract.objects[drawerIds[nearest]].pivot[1] - y)
    )
      nearest = index;
  });
  return nearest;
};
type HoverKey = PosedObject | (typeof drawerIds)[number];
// Places the instanced shadows and ripples (three's mutable scratch object).
const placer = new Object3D();
const scratch = {
  pivot: new Vector3(),
  offset: new Vector3(),
  scale: new Vector3(),
  turn: new Quaternion(),
  axisX: new Vector3(1, 0, 0),
  axisY: new Vector3(0, 1, 0),
  axisZ: new Vector3(0, 0, 1),
};
export function actionFor(object: Object3D): DeskAction | undefined {
  const id = object.userData.interaction;
  if (drawerIds.includes(id)) return "drawers";
  return actions.has(id) ? (id as DeskAction) : undefined;
}
/*
 * One instanced quad draws the three blob shadows and up to three click
 * ripples (October 24): a ripple is two warm rings that spread and fade, as
 * on water, so the effect costs no draw call or program of its own. Its
 * rings follow rippleRing() in desk-interaction-motion.ts; mode 2 draws
 * them in ink, for the white drawer fronts.
 */
const shadowSlots = 3;
const rippleSlots = 3;
const shadowVertex = `attribute vec2 aRipple; varying vec2 vUv; varying vec2 vRipple; void main(){vUv=uv;vRipple=aRipple;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
const shadowFragment = `varying vec2 vUv; varying vec2 vRipple;
float ring(float p, float i){float t=clamp((p-i*${rippleDelay.toFixed(2)})/${(1 - rippleDelay).toFixed(2)},0.,1.);if(t<=0.||t>=1.)return 0.;float e=1.-pow(1.-t,3.);float r=length((vUv-.5)*2.);return .55*(1.-t)*smoothstep(.06,0.,abs(r-(.3+.7*e)));}
void main(){if(vRipple.x<.5){float r=length((vUv-.5)*2.);gl_FragColor=vec4(0.,0.,0.,.22*pow(max(0.,1.-r),2.));return;}
float a=max(ring(vRipple.y,0.),ring(vRipple.y,1.));gl_FragColor=vRipple.x>1.5?vec4(.24,.27,.31,a):vec4(.914,.867,.816,a);}`;
type Ripple = {
  start: number;
  position: Vector3;
  /** On a drawer's front rather than flat on the desk. */
  vertical: boolean;
  /** Radius of the outer ring at its widest (m). */
  radius: number;
  /** A drawer's ripple rides out with it. */
  drawer?: number;
};
/** Where each object's ripple spreads when no point on it is known. */
const rippleAnchors: Record<
  PosedObject,
  { at: [number, number, number]; radius: number }
> = {
  headphones: { at: [0.48, 0.0055, -0.34], radius: 0.11 },
  mouse: { at: [0.39, 0.0055, 0.075], radius: 0.08 },
  tablet: { at: [-0.435, 0.0175, 0.17], radius: 0.09 },
  lamp: { at: [0.673, 0.0055, -0.3725], radius: 0.1 },
  dial: { at: [0.345, 0.0055, -0.3725], radius: 0.06 },
};
/** The drawers' fronts (m) and the cabinet's width. */
const drawerFront = 0.3625;
const drawerCenterX = 0.563;

// Three.js owns these mutable GPU resources, outside React's state model.
function cacheShadows(renderer: WebGLRenderer, cached: boolean) {
  renderer.shadowMap.autoUpdate = !cached;
  renderer.shadowMap.needsUpdate = true;
}
function dirtyShadows(renderer: WebGLRenderer) {
  renderer.shadowMap.needsUpdate = true;
}

const lampShadow = typeof window !== "undefined" && quality() !== "low";
/**
 * The three small glows (bias light, monitor bar, lamp spill) are point
 * lights every lit pixel pays for; integrated graphics go without them and
 * keep the lamp's spot light (butter series, October 9).
 */
const glowLights = lampShadow;

export default function InteractionScene({
  model,
  occluders,
  controls,
}: {
  model: Group;
  /** The model's objects that do nothing but still hide what is behind. */
  occluders: Occluders;
  controls: DeskInteractions;
}) {
  const { gl, invalidate } = useThree();
  // The element pointer events come from: the journey's wrapper (its canvas
  // takes none), or the review's canvas container. The cursor ring reads
  // `data-desk-hover` there (src/lib/cursor.ts).
  const connected = useThree((state) => state.events.connected) as
    HTMLElement | undefined;
  const hoverTarget = useCallback(
    () => connected ?? gl.domElement,
    [connected, gl],
  );
  const markHover = useCallback(
    (on: boolean) => {
      const element = hoverTarget();
      if (on) {
        element.setAttribute("data-desk-hover", "");
        element.style.setProperty("cursor", "pointer");
      } else {
        element.removeAttribute("data-desk-hover");
        element.style.removeProperty("cursor");
      }
    },
    [hoverTarget],
  );
  const setEvents = useThree((state) => state.setEvents);
  useEffect(() => {
    // Only the nearest object under the pointer counts (each handler stops
    // propagation). Objects without an action are not raycast, so check
    // that none of them sits in front of the nearest hit: a click on the
    // MacBook must not reach the dial behind it.
    setEvents({
      filter: (hits, state) =>
        hits.length && occluders.occludes(state.raycaster.ray, hits[0].distance)
          ? []
          : hits,
    });
    return () => setEvents({ filter: undefined });
  }, [setEvents, occluders]);
  const { active, reduced, registerMotion } = controls;
  const animationFrame = useRef<number | null>(null);
  const animateUntil = useRef(0);
  const requestAnimation = useCallback(
    (duration: number) => {
      animateUntil.current = Math.max(
        animateUntil.current,
        performance.now() + duration,
      );
      if (animationFrame.current !== null) return;
      const tick = () => {
        invalidate();
        if (performance.now() < animateUntil.current) {
          animationFrame.current = requestAnimationFrame(tick);
        } else {
          animationFrame.current = null;
        }
      };
      animationFrame.current = requestAnimationFrame(tick);
    },
    [invalidate],
  );
  useEffect(
    () => () => {
      if (animationFrame.current !== null)
        cancelAnimationFrame(animationFrame.current);
    },
    [],
  );
  useEffect(() => {
    if (active && !reduced) return;
    animateUntil.current = 0;
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  }, [active, reduced]);
  const lights = useRef<(PointLight | SpotLight | null)[]>([]);
  const biasStrip = useRef<Mesh>(null);
  const glow = useRef<Sprite>(null);
  const glowMap = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,0.6)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.22)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => glowMap.dispose(), [glowMap]);
  const lampTarget = useMemo(() => {
    const target = new Object3D();
    target.position.set(0.58, 0, -0.22);
    return target;
  }, []);
  const shadows = useRef<InstancedMesh>(null);
  // Per instance: mode (0 a blob shadow, 1 or 2 a ripple) and its progress.
  const shadowGeometry = useMemo(() => {
    const geometry = new PlaneGeometry(1, 1);
    const modes = new Float32Array((shadowSlots + rippleSlots) * 2);
    for (let i = shadowSlots; i < shadowSlots + rippleSlots; i++) {
      modes[i * 2] = 1;
      modes[i * 2 + 1] = 1;
    }
    geometry.setAttribute("aRipple", new InstancedBufferAttribute(modes, 2));
    return geometry;
  }, []);
  useEffect(() => () => shadowGeometry.dispose(), [shadowGeometry]);
  const ripples = useRef<(Ripple | null)[]>([]);
  const nextRipple = useRef(0);
  // Presses, hops and teases, by object: when each started.
  const presses = useRef<Partial<Record<PosedObject, number>>>({});
  const teases = useRef<Partial<Record<HoverKey, number>>>({});
  const drawerPressed = useRef<{ start: number; index: number } | null>(null);
  const dialDim = useRef<number | null>(null);
  // The hovered object eases up and the last one eases down.
  const hover = useRef<
    Partial<Record<HoverKey, { from: number; to: number; start: number }>>
  >({});
  const hovered = useRef<HoverKey | null>(null);
  // A press delays the click's own change (lights, colour) until it lands.
  const visualDelay = useRef(0);
  const running = useRef<
    Partial<Record<AnimatedObject, { start: number; variant: number }>>
  >({});
  const nextMouse = useRef(0);
  const drawerStart = useRef<number | null>(null);
  // True once a frame has applied the final state of every transition and
  // motion: the desk's other frames (the camera travelling, the pointer)
  // then skip that work, uploads included, as it would set the same values
  // again. Anything that starts a change clears it.
  const settled = useRef(false);
  const color = useRef(new Color(lampColors[initialLampColor]));
  const transition = useRef({
    start: 0,
    colorStart: new Color(lampColors[initialLampColor]),
    lightStart: 1,
    light: 1,
  });
  const nodes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(contract.objects).map(([id, item]) => [
          id,
          model.getObjectByName(item.node)!,
        ]),
      ),
    [model],
  );
  const origins = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(nodes).map(([id, node]) => {
          if (!node) throw new Error(`Missing desk interaction node: ${id}`);
          return [
            id,
            {
              position: node.position.clone(),
              quaternion: node.quaternion.clone(),
              scale: node.scale.clone(),
            },
          ];
        }),
      ),
    [nodes],
  );
  const targetColor = useMemo(
    () => new Color(lampColors[controls.colorIndex]),
    [controls.colorIndex],
  );
  const taskMaterials = useMemo(() => {
    const result: MeshStandardMaterial[] = [];
    nodes.taskLights.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial)
        result.push(o.material);
    });
    return result;
  }, [nodes]);
  const lampMaterials = useMemo(() => {
    const result: MeshStandardMaterial[] = [];
    nodes.lamp.traverse((o) => {
      if (
        o instanceof Mesh &&
        o.material instanceof MeshStandardMaterial &&
        o.material.name === "Rose opal diffuser"
      ) {
        result.push(o.material);
      }
    });
    return result;
  }, [nodes]);
  // Light positions are fixed. Rebuild depth maps only when a caster moves.
  useEffect(() => {
    cacheShadows(gl, true);
    invalidate();
    return () => {
      cacheShadows(gl, false);
    };
  }, [gl, invalidate]);
  useEffect(() => {
    const delay = visualDelay.current;
    visualDelay.current = 0;
    transition.current = {
      ...transition.current,
      start: performance.now() + delay,
      colorStart: color.current.clone(),
      lightStart: transition.current.light,
    };
    settled.current = false;
    if (!controls.reduced) requestAnimation(350 + delay);
    invalidate();
  }, [
    controls.lights,
    controls.colorIndex,
    controls.reduced,
    invalidate,
    requestAnimation,
  ]);
  const addRipple = useCallback(
    (id: DeskAction, point?: InteractionPoint, drawer?: number) => {
      let ripple: Ripple;
      const now = performance.now();
      if (id === "drawers") {
        const index = drawer ?? 0;
        const center = contract.objects[drawerIds[index]].pivot;
        ripple = {
          start: now,
          vertical: true,
          radius: 0.07,
          drawer: index,
          position: new Vector3(
            point?.[0] ?? drawerCenterX,
            point?.[1] ?? center[1],
            drawerFront,
          ),
        };
      } else {
        const anchor = rippleAnchors[id];
        ripple = {
          start: now,
          vertical: false,
          radius: anchor.radius,
          position: new Vector3(
            id === "mouse" && point ? point[0] : anchor.at[0],
            anchor.at[1],
            id === "mouse" && point ? point[2] : anchor.at[2],
          ),
        };
      }
      ripples.current[nextRipple.current] = ripple;
      nextRipple.current = (nextRipple.current + 1) % rippleSlots;
      // Counted as they start: a slow renderer may draw none of their frames.
      if (qa())
        gl.domElement.setAttribute(
          "data-ripples-started",
          String(Number(gl.domElement.dataset.ripplesStarted || 0) + 1),
        );
    },
    [gl],
  );
  useEffect(() => {
    return registerMotion((id, point, tease) => {
      if (!tease) gl.domElement.setAttribute("data-last-desk-action", id);
      if (!active || reduced) return;
      const now = performance.now();
      settled.current = false;
      if (tease) {
        // A hint that changes nothing: a ripple and a small hop or peek.
        if (id === "drawers") {
          const index = Math.floor(Math.random() * drawerIds.length);
          teases.current[drawerIds[qa() ? 0 : index]] = now;
          addRipple(id, undefined, qa() ? 0 : index);
        } else {
          teases.current[id] = now;
          if (id === "dial") dialDim.current = now;
          addRipple(id);
        }
        if (qa())
          gl.domElement.setAttribute(
            "data-teases",
            String(Number(gl.domElement.dataset.teases || 0) + 1),
          );
        requestAnimation(Math.max(teaseDuration, rippleDuration));
        invalidate();
        return;
      }
      if (id === "drawers") {
        if (drawerStart.current === null) {
          const index = point ? drawerAt(point[1]) : 0;
          drawerPressed.current = { start: now, index };
          drawerStart.current = now + drawerPress.lead;
          addRipple(id, point, index);
          gl.domElement.setAttribute("data-drawer-peak", "0.000");
          requestAnimation(drawerPress.lead + drawerWave.duration);
          invalidate();
        }
        return;
      }
      if (id === "lamp" || id === "dial") {
        presses.current[id] = now;
        visualDelay.current = pressLead;
        addRipple(id, point);
        requestAnimation(Math.max(pressDuration, rippleDuration));
        invalidate();
        return;
      }
      if (!animated.includes(id as AnimatedObject)) return;
      const key = id as AnimatedObject;
      if (running.current[key]) return;
      running.current[key] = {
        start: now,
        variant: id === "mouse" ? nextMouse.current++ % 5 : 0,
      };
      if (key !== "headphones") presses.current[key] = now;
      addRipple(id, point);
      requestAnimation(Math.max(animationDuration[key], rippleDuration));
      invalidate();
    });
  }, [
    active,
    reduced,
    registerMotion,
    invalidate,
    requestAnimation,
    gl,
    addRipple,
  ]);
  useEffect(() => {
    if (!controls.active || controls.reduced) {
      running.current = {};
      drawerStart.current = null;
      drawerPressed.current = null;
      presses.current = {};
      teases.current = {};
      hover.current = {};
      hovered.current = null;
      dialDim.current = null;
      ripples.current = [];
      dirtyShadows(gl);
      for (const id of drawerIds) nodes[id].position.copy(origins[id].position);
      for (const id of ["lamp", "dial", "tablet", "headphones", "mouse"]) {
        nodes[id].position.copy(origins[id].position);
        nodes[id].quaternion.copy(origins[id].quaternion);
        nodes[id].scale.copy(origins[id].scale);
      }
      gl.domElement.setAttribute("data-drawers-motion", "idle");
      gl.domElement.setAttribute(
        "data-drawer-offsets",
        "0.000,0.000,0.000,0.000",
      );
      for (const id of animated) {
        const key = id === "tablet" ? "pencil" : id;
        nodes[key].position.copy(origins[key].position);
        nodes[key].quaternion.copy(origins[key].quaternion);
      }
      if (shadows.current) {
        const modes = shadows.current.geometry.getAttribute("aRipple");
        for (let i = 0; i < rippleSlots; i++) {
          placer.scale.setScalar(0);
          placer.updateMatrix();
          shadows.current.setMatrixAt(shadowSlots + i, placer.matrix);
          modes.setY(shadowSlots + i, 1);
        }
        modes.needsUpdate = true;
        shadows.current.instanceMatrix.needsUpdate = true;
      }
      markHover(false);
      invalidate();
    }
  }, [
    controls.active,
    controls.reduced,
    nodes,
    origins,
    gl,
    invalidate,
    markHover,
  ]);
  useEffect(() => () => markHover(false), [markHover]);
  useEffect(() => {
    settled.current = false;
  }, [
    nodes,
    origins,
    targetColor,
    lampMaterials,
    taskMaterials,
    controls.lights,
    controls.reduced,
    controls.active,
  ]);
  useFrame(() => {
    if (!controls.active) return;
    const movingCasters =
      drawerStart.current !== null ||
      animated.some((id) => running.current[id]) ||
      Object.keys(teases.current).length > 0;
    if (movingCasters) dirtyShadows(gl);
    // A final clean frame also makes idle metrics exclude the last depth update.
    if (gl.shadowMap.needsUpdate) invalidate();
    if (settled.current) return;
    const writeQa = qa();
    const now = performance.now();
    let busy = false;
    // How far a timed motion has run (0 to 1), or 0 once it has finished.
    const progress = <K extends string>(
      jobs: Partial<Record<K, number>>,
      key: K,
      duration: number,
    ) => {
      const start = jobs[key];
      if (start === undefined) return 0;
      const t = (now - start) / duration;
      if (t >= 1) {
        delete jobs[key];
        return 0;
      }
      busy = true;
      return Math.max(0, t);
    };
    const level = (key: HoverKey) => {
      const job = hover.current[key];
      if (!job) return 0;
      const elapsed = now - job.start;
      const value = hoverLevel(job.from, job.to, elapsed);
      if (elapsed < hoverDuration) busy = true;
      else if (job.to === 0) delete hover.current[key];
      return value;
    };
    const elapsed = now - transition.current.start;
    const ct = controls.reduced ? 1 : Math.max(0, Math.min(1, elapsed / 350));
    const lt = controls.reduced ? 1 : Math.max(0, Math.min(1, elapsed / 250));
    const ease = (t: number) => t * t * (3 - 2 * t);
    color.current
      .copy(transition.current.colorStart)
      .lerp(targetColor, ease(ct));
    if (glow.current)
      (glow.current.material as SpriteMaterial).color.copy(color.current);
    lampMaterials.forEach((material) => {
      material.color.copy(color.current);
      material.emissive.copy(color.current);
      material.emissiveIntensity = 9;
      material.roughness = 1;
    });
    const light =
      transition.current.lightStart +
      ((controls.lights ? 1 : 0) - transition.current.lightStart) * ease(lt);
    transition.current.light = light;
    // A teased dial dims the lights for a moment; the state stays as it was.
    let dim = 1;
    if (dialDim.current !== null) {
      const t = (now - dialDim.current) / teaseDuration;
      if (t >= 1) dialDim.current = null;
      else {
        dim = teaseDim(t);
        busy = true;
      }
    }
    const shown = light * dim;
    taskMaterials.forEach((material) => {
      material.emissiveIntensity = 2 * shown;
      material.color.setRGB(
        0.08 + 0.87 * shown,
        0.08 + 0.64 * shown,
        0.08 + 0.32 * shown,
      );
    });
    if (biasStrip.current) {
      const material = biasStrip.current.material as MeshStandardMaterial;
      material.emissiveIntensity = 4 * shown;
      material.color.setScalar(0.04 + 0.8 * shown);
    }
    lights.current.forEach((lamp, i) => {
      if (lamp) {
        if (i === 3) lamp.color.copy(color.current);
        else lamp.intensity = [0.22, 0.35, 0.65][i] * shown;
      }
    });
    if (ct < 1 || lt < 1) busy = true;
    // Places a node at its authored pose plus an offset, squashed towards a
    // height on its own vertical axis and turned about a local axis (about
    // that pivot too when `orbit`, else about its own origin).
    const place = (
      key: string,
      x: number,
      y: number,
      z: number,
      axis: Vector3 | null,
      angle: number,
      squash: number,
      pivotY: number,
      orbit: boolean,
    ) => {
      const node = nodes[key];
      const origin = origins[key];
      const o = origin.position;
      const across = squash === 1 ? 1 : 1 / Math.sqrt(squash);
      scratch.scale.set(across, squash, across);
      scratch.pivot.set(o.x, pivotY, o.z);
      scratch.offset
        .set(o.x + x, o.y + y, o.z + z)
        .sub(scratch.pivot)
        .multiply(scratch.scale);
      node.quaternion.copy(origin.quaternion);
      if (axis && angle) {
        scratch.turn.setFromAxisAngle(axis, angle);
        if (orbit) scratch.offset.applyQuaternion(scratch.turn);
        node.quaternion.multiply(scratch.turn);
      }
      node.position.copy(scratch.pivot).add(scratch.offset);
      node.scale.copy(origin.scale).multiply(scratch.scale);
    };
    const lift = (id: PosedObject) =>
      hoverLift[id] * level(id) +
      teaseLift(progress(teases.current, id, teaseDuration));
    const drawerElapsed =
      drawerStart.current === null
        ? drawerWave.duration
        : now - drawerStart.current;
    const drawersMoving = drawerElapsed < drawerWave.duration;
    const pressed = drawerPressed.current;
    const pressElapsed = pressed ? now - pressed.start : Infinity;
    if (pressed && pressElapsed >= drawerPress.duration)
      drawerPressed.current = null;
    else if (pressed) busy = true;
    drawerIds.forEach((id, index) => {
      const tease = progress(teases.current, id, teaseDuration);
      nodes[id].position.z =
        origins[id].position.z +
        drawerOffset(drawerElapsed, index) +
        (pressed?.index === index ? drawerPressOffset(pressElapsed) : 0) +
        drawerPeek * level(id) +
        (tease ? teasePeek * Math.sin(Math.PI * tease) ** 2 : 0);
    });
    if (writeQa) {
      const offsets = drawerIds.map((_, index) =>
        drawerOffset(drawerElapsed, index).toFixed(3),
      );
      gl.domElement.setAttribute("data-drawer-offsets", offsets.join(","));
      // The wave's largest offset, so a slow renderer that draws few frames
      // cannot hide the movement between samples.
      if (drawersMoving)
        gl.domElement.setAttribute(
          "data-drawer-peak",
          Math.max(
            Number(gl.domElement.dataset.drawerPeak || 0),
            ...offsets.map(Number),
          ).toFixed(3),
        );
      gl.domElement.setAttribute(
        "data-drawers-motion",
        drawersMoving ? "running" : "idle",
      );
    }
    if (drawersMoving) busy = true;
    else drawerStart.current = null;
    // The lamp, the dial and the tablet answer with a press.
    {
      const t = progress(presses.current, "lamp", pressDuration);
      place(
        "lamp",
        0,
        lift("lamp"),
        0,
        scratch.axisX,
        lampNod(t),
        pressScale(t, pressDepth.lamp),
        squashPivot.lamp,
        true,
      );
    }
    {
      const t = progress(presses.current, "dial", pressDuration);
      const tease = teases.current.dial;
      const teased =
        tease === undefined ? 0 : Math.min(1, (now - tease) / teaseDuration);
      place(
        "dial",
        0,
        hoverLift.dial * level("dial"),
        0,
        null,
        0,
        pressScale(t, pressDepth.dial) * pressScale(teased, 0.08),
        squashPivot.dial,
        false,
      );
      // The dial's tease is its press and the dimming, not a hop.
      progress(teases.current, "dial", teaseDuration);
    }
    {
      const t = progress(presses.current, "tablet", pressDuration);
      place(
        "tablet",
        0,
        tabletDip(t) + lift("tablet"),
        0,
        null,
        0,
        1,
        squashPivot.tablet,
        false,
      );
    }
    for (const [index, id] of animated.entries()) {
      const key = id === "tablet" ? "pencil" : id;
      const job = running.current[id];
      const t = job
        ? Math.min(1, (now - job.start) / animationDuration[id])
        : 1;
      const pose = accessoryPose(id, t, job?.variant);
      if (id === "headphones") {
        const hop = hopPose(t);
        place(
          key,
          0,
          pose.y + lift("headphones"),
          0,
          scratch.axisZ,
          pose.rotation,
          hop.scale,
          squashPivot.headphones,
          true,
        );
      } else if (id === "mouse") {
        const press = progress(presses.current, "mouse", pressDuration);
        place(
          key,
          pose.x,
          pose.y + lift("mouse"),
          pose.z,
          scratch.axisY,
          pose.rotation,
          pressScale(press, pressDepth.mouse),
          squashPivot.mouse,
          false,
        );
      } else {
        place(
          key,
          pose.x,
          pose.y,
          pose.z,
          scratch.axisZ,
          pose.rotation,
          1,
          origins[key].position.y,
          false,
        );
      }
      if (shadows.current) {
        placer.rotation.set(-Math.PI / 2, 0, 0);
        placer.position.set(
          nodes[key].position.x,
          0.0043,
          nodes[key].position.z,
        );
        const size =
          id === "headphones"
            ? [0.15, 0.1]
            : id === "mouse"
              ? [0.11, 0.15]
              : [0.016, 0.175];
        placer.scale.set(size[0], size[1], 1);
        placer.updateMatrix();
        shadows.current.setMatrixAt(index, placer.matrix);
        shadows.current.instanceMatrix.needsUpdate = true;
      }
      if (job && t < 1) busy = true;
      else delete running.current[id];
      if (writeQa)
        gl.domElement.setAttribute(
          `data-${id}-motion`,
          job && t < 1 ? "running" : "idle",
        );
    }
    // The ripples spread on the desk, or on a drawer's front as it moves.
    if (shadows.current) {
      const modes = shadows.current.geometry.getAttribute("aRipple");
      let spreading = 0;
      for (let i = 0; i < rippleSlots; i++) {
        const ripple = ripples.current[i];
        const p = ripple ? (now - ripple.start) / rippleDuration : 1;
        if (!ripple || p >= 1) {
          ripples.current[i] = null;
          placer.scale.setScalar(0);
          modes.setY(shadowSlots + i, 1);
        } else {
          busy = true;
          spreading++;
          placer.position.copy(ripple.position);
          if (ripple.drawer !== undefined) {
            const id = drawerIds[ripple.drawer];
            placer.position.z += nodes[id].position.z - origins[id].position.z;
          }
          placer.rotation.set(ripple.vertical ? 0 : -Math.PI / 2, 0, 0);
          placer.scale.set(2 * ripple.radius, 2 * ripple.radius, 1);
          modes.setXY(shadowSlots + i, ripple.vertical ? 2 : 1, Math.max(0, p));
        }
        placer.updateMatrix();
        shadows.current.setMatrixAt(shadowSlots + i, placer.matrix);
      }
      modes.needsUpdate = true;
      shadows.current.instanceMatrix.needsUpdate = true;
      if (writeQa)
        gl.domElement.setAttribute("data-ripples", String(spreading));
    }
    if (writeQa) {
      gl.domElement.setAttribute("data-lights", light.toFixed(3));
      gl.domElement.setAttribute(
        "data-lamp-color",
        color.current.getHexString(),
      );
      gl.domElement.setAttribute(
        "data-mouse-variant",
        String((nextMouse.current + 4) % 5),
      );
    }
    if (busy) invalidate();
    settled.current = !busy;
  });
  const click = (event: ThreeEvent<MouseEvent>, id?: DeskAction) => {
    event.stopPropagation();
    if (event.delta > 5) return;
    const action = id ?? actionFor(event.object);
    if (action) controls.activate(action, event.point.toArray());
  };
  // The hovered object lifts a little (a drawer peeks out) and the cursor
  // ring opens: both say it can be clicked.
  const setHovered = (key: HoverKey | null) => {
    if (hovered.current === key) return;
    const now = performance.now();
    const ease = (target: HoverKey, to: number) => {
      const job = hover.current[target];
      const from = job ? hoverLevel(job.from, job.to, now - job.start) : 0;
      hover.current[target] = { from, to, start: now };
    };
    if (hovered.current) ease(hovered.current, 0);
    if (key && active && !reduced) ease(key, 1);
    hovered.current = key;
    settled.current = false;
    requestAnimation(hoverDuration);
    invalidate();
  };
  const over = (event: ThreeEvent<PointerEvent>, id?: DeskAction) => {
    event.stopPropagation();
    const action = id ?? actionFor(event.object);
    markHover(!!action);
    if (!action) return setHovered(null);
    setHovered(
      action === "drawers"
        ? drawerIds[drawerAt(event.point.y)]
        : (action as PosedObject),
    );
  };
  const out = () => {
    markHover(false);
    setHovered(null);
  };
  return (
    <>
      <primitive
        object={model}
        dispose={null}
        onClick={click}
        onPointerOver={over}
        onPointerOut={out}
      />
      {Object.entries(contract.targets).map(([id, target]) => (
        <mesh
          key={id}
          position={target.position as [number, number, number]}
          onClick={(event) => click(event, id as DeskAction)}
          onPointerOver={(event) => over(event, id as DeskAction)}
          onPointerOut={out}
        >
          <boxGeometry args={target.size as [number, number, number]} />
          <meshBasicMaterial
            visible={false}
            transparent
            opacity={0}
            depthWrite={false}
            colorWrite={false}
          />
        </mesh>
      ))}
      {glowLights ? (
        <pointLight
          ref={(node) => {
            lights.current[0] = node;
          }}
          position={[-0.72, 0.3, -0.43]}
          intensity={0.22}
          distance={1.1}
          color="#ffbc78"
        />
      ) : null}
      {glowLights ? (
        <pointLight
          ref={(node) => {
            lights.current[1] = node;
          }}
          position={[0.09, 0.53, -0.24]}
          intensity={0.35}
          distance={1.2}
          color="#ffe1b0"
        />
      ) : null}
      {glowLights ? (
        <pointLight
          ref={(node) => {
            lights.current[2] = node;
          }}
          position={[0.08, 0.2, -0.36]}
          intensity={0.65}
          distance={0.9}
          color="#ffb774"
        />
      ) : null}
      <sprite ref={glow} position={[0.673, 0.12, -0.33]} scale={[0.3, 0.38, 1]}>
        <spriteMaterial
          map={glowMap}
          blending={AdditiveBlending}
          transparent
          opacity={0.8}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <primitive object={lampTarget} />
      <spotLight
        // Integrated graphics skip the lamp's shadow (src/lib/quality.ts).
        castShadow={lampShadow}
        target={lampTarget}
        angle={1.25}
        penumbra={0.8}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.02}
        shadow-camera-far={1.5}
        shadow-bias={-0.0002}
        shadow-normalBias={0.001}
        ref={(node) => {
          lights.current[3] = node;
        }}
        position={[0.673, 0.16, -0.33]}
        intensity={3}
        distance={1.2}
      />
      <mesh ref={biasStrip} position={[0.09, 0.3, -0.322]}>
        <boxGeometry args={[0.61, 0.006, 0.006]} />
        <meshStandardMaterial
          color="#ffe0b0"
          emissive="#ffb774"
          emissiveIntensity={4}
        />
      </mesh>
      <instancedMesh
        ref={shadows}
        args={[shadowGeometry, undefined, shadowSlots + rippleSlots]}
        frustumCulled={false}
      >
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader={shadowVertex}
          fragmentShader={shadowFragment}
        />
      </instancedMesh>
    </>
  );
}
