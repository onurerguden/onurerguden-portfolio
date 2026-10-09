"use client";
import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import DeskPlatform from "./platform";
import CosmicEnvironment, { type CosmicPointer } from "./cosmic-environment";
import DeskLighting from "./lighting";
import { DeskObjectControls, useDeskInteractions } from "./interactions";
import { Canvas, useFrame, useThree, type RootStore } from "@react-three/fiber";
import { deskEvents } from "./desk-events";
import { Matrix4, Quaternion, Vector3, PerspectiveCamera } from "three";
import { Model } from "./model";
import { offerProgramHost } from "@/components/three/program-host";
import { createScreenProjection, projectScreen } from "@/lib/desk-projection";
import { cameraAnchors } from "@/lib/desk-story/anchors";
import {
  screenIds,
  screenPixelWidths,
  screenStops,
  screens,
  type CameraStop,
} from "@/lib/desk-story/camera";
import {
  createResolutionGovernor,
  measureFrameInterval,
  rememberLevel,
  rememberedLevel,
  resolutionLevels,
  type ResolutionGovernor,
} from "@/lib/desk-story/frame-budget";
import { createGpuTimer, type GpuTimer } from "@/components/three/gpu-timer";
import { quality } from "@/lib/quality";
import { qa } from "@/lib/qa";
import { storyAt, type StoryState } from "@/lib/desk-story/timeline";
import type { Signal } from "@/lib/desk-story/signal";
import { shadeOf, type PanelRefs } from "./screen-panels";
import type { StoryMeasure } from "./use-story-layout";
export type JourneySceneProps = {
  poster?: boolean;
  distance: Signal<number>;
  active: boolean;
  locale: "en" | "tr";
  onReady: () => void;
  onFailure: () => void;
  /** The element the canvas fills and takes pointer events from. */
  wrapper: RefObject<HTMLDivElement | null>;
  /** The screen panels, owned by the journey so they exist before the 3D. */
  panels: PanelRefs;
  layout: RefObject<StoryMeasure>;
};

const screenTransforms = screens.map((screen) => {
  const normal = new Vector3(...screen.normal).normalize();
  const up = new Vector3(...screen.up).normalize();
  const right = new Vector3().crossVectors(up, normal).normalize();
  const basis = new Matrix4().makeBasis(right, up, normal);
  return {
    position: new Vector3(...screen.position).addScaledVector(normal, 0.0008),
    quaternion: new Quaternion().setFromRotationMatrix(basis),
  };
});

const depthVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const depthFragmentShader = `
  void main() {
    gl_FragColor = vec4(0.0);
  }
`;

/**
 * These planes punch the physical display surfaces out of the transparent
 * WebGL canvas while still writing depth. Screen DOM stays in one shared layer
 * beneath the canvas, so real desk geometry naturally remains in front.
 *
 * Drawn first: each plane sits just in front of its screen's glass, so the
 * glass behind it then fails the depth test instead of being shaded and
 * overwritten. Anything nearer than a plane still draws over it.
 */
function ScreenDepthPlanes() {
  return screens.map((screen, index) => {
    const transform = screenTransforms[index];
    return (
      <mesh
        key={screenIds[index]}
        renderOrder={-1}
        position={transform.position}
        quaternion={transform.quaternion}
        scale={[screen.width, screen.height, 1]}
      >
        <planeGeometry />
        <shaderMaterial
          vertexShader={depthVertexShader}
          fragmentShader={depthFragmentShader}
          depthTest
          depthWrite
          toneMapped={false}
        />
      </mesh>
    );
  });
}

const diveStage = (dive: number) => (dive >= 1 ? 2 : dive > 0 ? 1 : 0);
/** Everything the desk's frame depends on; equal views draw equal frames. */
function sameView(a: StoryState | null, b: StoryState) {
  if (
    !a ||
    a.from !== b.from ||
    a.to !== b.to ||
    a.travel !== b.travel ||
    a.active !== b.active
  )
    return false;
  for (let i = 0; i < b.dive.length; i++)
    if (diveStage(a.dive[i]) !== diveStage(b.dive[i])) return false;
  return true;
}

/** How far the pointer turns the camera at each stop. */
const pointerStrength = (stop: CameraStop) =>
  stop === "opening"
    ? 0
    : stop === "room"
      ? 1
      : stop === "desktop"
        ? 0.6
        : 0.08;

function Driver({
  distance,
  active,
  running,
  onFailure,
  panels,
  layout,
  wrapper: surface,
}: JourneySceneProps & { running: boolean }) {
  const { camera, gl, size, invalidate } = useThree();
  // One projection per screen and panel width; a diving screen's panel
  // changes width with the viewport.
  const projections = useRef(
    screens.map(
      () => new Map<number, ReturnType<typeof createScreenProjection>>(),
    ),
  );
  const frames = useRef(0);
  const pointer = useRef<CosmicPointer>({
    x: 0,
    y: 0,
    currentX: 0,
    currentY: 0,
    targetInfluence: 0,
    influence: 0,
  });
  const temp = useMemo(
    () => ({
      position: new Vector3(),
      target: new Vector3(),
      a: new Vector3(),
      b: new Vector3(),
      c: new Vector3(),
      d: new Vector3(),
      arc: new Vector3(),
    }),
    [],
  );
  const anchors = useMemo(
    () => cameraAnchors(size.width, size.height),
    [size.width, size.height],
  );
  // The Canvas owns the frame loop (see JourneyScene); a change of either
  // asks for a fresh frame once frames are allowed.
  useEffect(() => {
    gl.domElement.setAttribute("data-active", String(active));
    if (running) invalidate();
  }, [active, running, invalidate, gl]);
  useEffect(() => {
    // Scrolling through a reading stop leaves the camera where it is; the
    // frame would be identical, so only a moving camera redraws the desk.
    let drawn: StoryState | null = null;
    return distance.on((d) => {
      if (!active) return;
      const step = storyAt(layout.current.timeline, d);
      if (!sameView(drawn, step)) {
        drawn = step;
        invalidate();
      } else if (qa()) {
        // The desk already shows this distance; record it for QA.
        gl.domElement.setAttribute("data-distance", String(step.distance));
      }
    });
  }, [distance, active, invalidate, layout, gl]);
  useEffect(() => {
    invalidate();
  }, [anchors, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.setAttribute("tabindex", "-1");
    canvas.setAttribute("aria-hidden", "true");
    const lost = (event: Event) => {
      event.preventDefault();
      console.error("Desk WebGL context lost");
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onFailure]);
  useEffect(() => {
    const node = surface.current;
    if (!node || !matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    let dampingFrame = 0;
    const keepRendering = () => {
      invalidate();
      const state = pointer.current;
      const unsettled =
        Math.abs(state.x - state.currentX) +
        Math.abs(state.y - state.currentY) +
        Math.abs(state.targetInfluence - state.influence);
      dampingFrame =
        active && unsettled > 0.002
          ? window.requestAnimationFrame(keepRendering)
          : 0;
    };
    const wake = () => {
      if (!active) return;
      invalidate();
      if (!dampingFrame)
        dampingFrame = window.requestAnimationFrame(keepRendering);
    };
    // Draws only for a change the frame would show: below the threshold the
    // damping above settles at, a frame would look the same. Most moves over
    // a control, or along a still part of the view, change nothing.
    const aim = (x: number, y: number, influence: number, snap = false) => {
      const p = pointer.current;
      if (
        Math.abs(x - p.x) <= 0.002 &&
        Math.abs(y - p.y) <= 0.002 &&
        Math.abs(influence - p.targetInfluence) <= 0.002 &&
        !(snap && Math.abs(influence - p.influence) > 0.002)
      )
        return;
      p.x = x;
      p.y = y;
      p.targetInfluence = influence;
      if (snap) p.influence = influence;
      wake();
    };
    const move = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const excluded = target?.closest(
        'a, button, summary, [data-screen], [data-cosmic-exclusion="true"]',
      );
      if (excluded) {
        aim(0, 0, 0, true);
        return;
      }
      const rect = node.getBoundingClientRect();
      aim(
        Math.max(
          -1,
          Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
        ),
        Math.max(
          -1,
          Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1),
        ),
        1,
      );
    };
    const leave = () => aim(0, 0, 0);
    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerleave", leave);
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      window.cancelAnimationFrame(dampingFrame);
    };
  }, [active, invalidate, surface]);
  useFrame((_state, delta) => {
    if (!active) return;
    const story = layout.current;
    const step = storyAt(story.timeline, distance.get());
    const a = anchors[step.from],
      b = anchors[step.to],
      t = step.travel;
    if (step.from === step.to) {
      temp.position.copy(a.position);
      temp.target.copy(a.target);
    } else {
      // A forward-facing arc clears the desk and adds parallax; zero endpoint velocity.
      temp.a.copy(a.position);
      temp.b
        .copy(a.position)
        .lerp(b.position, 0.3)
        .add(temp.arc.set(step.to === "portrait" ? -0.2 : 0.15, 0.1, 0.25));
      temp.c
        .copy(a.position)
        .lerp(b.position, 0.7)
        .add(temp.arc.set(step.to === "room" ? 0.13 : -0.045, 0.045, 0.15));
      temp.d.copy(b.position);
      const u = 1 - t;
      temp.position
        .copy(temp.a)
        .multiplyScalar(u * u * u)
        .addScaledVector(temp.b, 3 * u * u * t)
        .addScaledVector(temp.c, 3 * u * t * t)
        .addScaledVector(temp.d, t * t * t);
      temp.target.copy(a.target).lerp(b.target, t);
    }
    if (camera instanceof PerspectiveCamera) {
      const fov =
        a.fov +
        (b.fov - a.fov) * t +
        (step.from !== step.to ? 3 * Math.sin(Math.PI * t) : 0);
      camera.setFocalLength(
        camera.getFilmHeight() / (2 * Math.tan((fov * Math.PI) / 360)),
      );
    }
    camera.position.copy(temp.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(temp.target);
    if (step.from !== step.to)
      camera.rotateZ(
        ((Math.sin(t * Math.PI) * Math.PI) / 180) *
          (step.to === "macbook" ? -1.9 : 1.6),
      );
    const p = pointer.current;
    const clampedDelta = Math.min(delta, 0.1);
    const positionDamping = 1 - Math.exp(-8 * clampedDelta);
    const influenceDamping = 1 - Math.exp(-7 * clampedDelta);
    p.currentX += (p.x - p.currentX) * positionDamping;
    p.currentY += (p.y - p.currentY) * positionDamping;
    p.influence += (p.targetInfluence - p.influence) * influenceDamping;
    if (Math.abs(p.x - p.currentX) < 0.005) p.currentX = p.x;
    if (Math.abs(p.y - p.currentY) < 0.005) p.currentY = p.y;
    if (Math.abs(p.targetInfluence - p.influence) < 0.03)
      p.influence = p.targetInfluence;
    const amount =
      pointerStrength(step.from) +
      (pointerStrength(step.to) - pointerStrength(step.from)) * t;
    camera.rotateY((-p.currentX * amount * Math.PI) / 90);
    camera.rotateX((-p.currentY * amount * Math.PI) / 180);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    panels.current.forEach((panel, index) => {
      if (!panel) return;
      const layout =
        index === 0
          ? story.screens.portrait
          : index === 2
            ? story.screens.macbook
            : null;
      // While a screen takes over the view, the journey places it instead.
      if (layout?.dive && step.dive[index] > 0) return;
      // A diving screen's panel is laid out for the whole view; the desk
      // shows its top, cropped to the screen's shape.
      // From the layout, not offsetWidth: reading layout here, after this
      // frame's style writes, would force a synchronous reflow every frame.
      const panelWidth = layout?.width ?? screenPixelWidths[index];
      const crop = layout?.dive
        ? Math.min(
            panelWidth,
            layout.height * (screens[index].width / screens[index].height),
          )
        : panelWidth;
      const offsetX = (panelWidth - crop) / 2;
      let projection = projections.current[index].get(crop);
      if (!projection) {
        projection = createScreenProjection(screens[index], crop);
        projections.current[index].set(crop, projection);
      }
      const matrix = projectScreen(projection, camera, size.width, size.height);
      // Hidden by opacity, not visibility, so a panel behind the camera
      // stays in the accessibility tree.
      panel.style.visibility = "visible";
      panel.style.opacity = matrix ? "" : "0";
      if (matrix) {
        if (offsetX) {
          // Shift the panel so the crop's left edge meets the screen's.
          for (let row = 0; row < 4; row++)
            matrix[12 + row] -= offsetX * matrix[row];
        }
        panel.style.transform = `matrix3d(${matrix.join(",")})`;
      }
      const cropHeight = crop / (screens[index].width / screens[index].height);
      panel.style.clipPath = layout?.dive
        ? `inset(0 ${offsetX}px ${layout.height - cropHeight}px ${offsetX}px)`
        : "";
      const current = step.active === index;
      panel.dataset.active = String(current);
      panel.style.pointerEvents = current ? "auto" : "none";
      const fromEmphasis =
        step.from === "room" || step.from === screenStops[index] ? 1 : 0;
      const toEmphasis =
        step.to === "room" || step.to === screenStops[index] ? 1 : 0;
      shadeOf(panel).style.opacity = String(
        0.35 * (1 - fromEmphasis - (toEmphasis - fromEmphasis) * t),
      );
    });

    if (qa()) {
      const canvas = gl.domElement;
      canvas.setAttribute("data-frames", String(++frames.current));
      canvas.setAttribute("data-distance", String(step.distance));
      canvas.setAttribute("data-camera", camera.position.toArray().join(","));
    }
  }, -1);
  return <CosmicEnvironment pointer={pointer} />;
}
/**
 * Keeps the desk's resolution where its moving frames fit this display
 * (src/lib/desk-story/frame-budget.ts): lower when they don't, back up when
 * the GPU has room again. A change reallocates the drawing buffer and
 * changes the image's sharpness, so it waits until the desk has been still
 * for a moment instead of landing mid-move.
 */
function AdaptiveResolution({
  levels,
  level,
  onStep,
  timerRef,
}: {
  levels: number[];
  level: number;
  onStep: (dpr: number) => void;
  timerRef: RefObject<GpuTimer | null | undefined>;
}) {
  const governor = useRef<ResolutionGovernor | null>(null);
  const still = useRef(0);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    let cancelled = false;
    void measureFrameInterval().then((frameMs) => {
      if (cancelled || levels.length < 2) return;
      governor.current = createResolutionGovernor({
        levels,
        level,
        frameMs,
        now: performance.now(),
      });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(still.current);
    };
    // One governor per mount: it follows the levels it proposes itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels]);
  useFrame(() => {
    const judge = governor.current;
    if (!judge) return;
    const now = performance.now();
    judge.record(now);
    for (const ms of timerRef.current?.poll() ?? []) judge.recordGpu(ms, now);
    window.clearTimeout(still.current);
    still.current = window.setTimeout(() => {
      const at = performance.now();
      for (const ms of timerRef.current?.poll() ?? []) judge.recordGpu(ms, at);
      const next = judge.proposal();
      if (next === null) return;
      // Through the Canvas's dpr prop: R3F re-applies that prop whenever the
      // Canvas renders, which would undo a setDpr made from inside.
      onStep(next);
      judge.applied(next, at);
      rememberLevel(next);
      if (next < levels[0])
        gl.domElement.setAttribute("data-dpr-reduced", String(next));
      else gl.domElement.removeAttribute("data-dpr-reduced");
    }, 250);
  });
  return null;
}
/** Include reflection and shadow passes in the reported per-frame cost. */
function RenderFrame({
  timerRef,
}: {
  timerRef: RefObject<GpuTimer | null | undefined>;
}) {
  useEffect(() => () => timerRef.current?.dispose(), [timerRef]);
  useFrame(({ gl }) => {
    gl.info.autoReset = false;
    gl.info.reset();
  }, -2);
  useFrame(({ scene, camera, gl }) => {
    if (gl.domElement.dataset.active === "false") return;
    // The desk's own GPU time per frame decides its resolution.
    if (timerRef.current === undefined)
      timerRef.current = createGpuTimer(
        gl.getContext() as WebGL2RenderingContext,
      );
    timerRef.current?.begin();
    gl.render(scene, camera);
    timerRef.current?.end();
    if (!qa()) return;
    const canvas = gl.domElement;
    canvas.setAttribute("data-draw-calls", String(gl.info.render.calls));
    canvas.setAttribute("data-triangles", String(gl.info.render.triangles));
    canvas.setAttribute(
      "data-peak-draw-calls",
      String(
        Math.max(
          Number(canvas.dataset.peakDrawCalls || 0),
          gl.info.render.calls,
        ),
      ),
    );
  }, 1);
  return null;
}
/** Offers the warm desk's context for compiling scenes ahead (program-host.ts). */
function ProgramHost() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  useEffect(() => offerProgramHost(gl, scene), [gl, scene]);
  return null;
}

const coarsePointer = () =>
  typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
function JourneyScene(props: JourneySceneProps) {
  const controls = useDeskInteractions(props.active, false);
  const readyCallback = props.onReady;
  // Nothing draws until the scene is warm (every program linked, textures
  // uploaded, one hidden frame drawn): a frame drawn earlier would compile
  // its shaders synchronously and freeze the page for seconds on a first
  // visit.
  const [warm, setWarm] = useState(false);
  const onReady = useCallback(() => {
    setWarm(true);
    readyCallback();
  }, [readyCallback]);
  // Phones and tablets already have dense screens; the extra pixels cost
  // battery for no visible gain. AdaptiveResolution moves between the levels
  // as frames allow. Integrated graphics start at one device pixel per CSS
  // pixel, without multisampling or the lamp's shadow (src/lib/quality.ts).
  const [low] = useState(() => quality() === "low");
  const [levels] = useState(() =>
    resolutionLevels(
      low ? 1 : coarsePointer() ? 1.25 : 1.5,
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
      // Integrated graphics may go below one device pixel per CSS pixel.
      low ? 0.85 : 1,
    ),
  );
  // A computer that settled on a lower level last time starts there.
  const [dpr, setDpr] = useState(() => rememberedLevel(levels) ?? levels[0]);
  const timer = useRef<GpuTimer | null | undefined>(undefined);
  const running = warm && controls.active;
  const { distance, layout } = props;
  // While the camera travels the desk slides under the pointer by itself;
  // hover waits for it to stop rather than raycasting every move.
  const events = useCallback(
    (store: RootStore) =>
      deskEvents(store, () => {
        const step = storyAt(layout.current.timeline, distance.get());
        return step.from !== step.to;
      }),
    [distance, layout],
  );
  return (
    <>
      <Canvas
        eventSource={props.wrapper as RefObject<HTMLElement>}
        events={events}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
        }}
        // PCF, which three now renders for PCFSoft anyway; naming it keeps
        // R3F from marking the cached shadow maps dirty on every render.
        shadows="percentage"
        dpr={dpr}
        // The only place the frame loop is set: R3F re-applies this prop on
        // every Canvas render, so a setFrameloop from inside would not last.
        frameloop={running ? "demand" : "never"}
        // The curtain scales the scene back in CSS; measured by its layout
        // box, the canvas keeps its drawing buffer instead of reallocating
        // and redrawing it at a new size on every scroll frame.
        resize={{ offsetSize: true, scroll: false }}
        camera={{ fov: 43, near: 0.01, far: 30 }}
        // The desk is the page's one heavy scene: on a computer with two GPUs
        // it gets the faster one. Section scenes stay on low power.
        gl={{
          antialias: !low,
          alpha: true,
          powerPreference: low ? "low-power" : "high-performance",
        }}
      >
        <DeskLighting />

        <ambientLight intensity={0.45} color="#cad6ef" />
        <directionalLight
          position={[-3, 2.4, 1]}
          intensity={1.65}
          color="#fff8ed"
          // Integrated graphics skip the sun's shadow too (src/lib/quality.ts).
          castShadow={!low}
          shadow-mapSize={[512, 512]}
          shadow-camera-left={-1.5}
          shadow-camera-right={1.5}
          shadow-camera-top={1.5}
          shadow-camera-bottom={-1.5}
          shadow-normalBias={0.015}
          shadow-bias={-0.0001}
          shadow-radius={4}
        />
        <directionalLight
          position={[-0.65, 1.45, 0.6]}
          intensity={1.8}
          color="#ffdcad"
        />
        <directionalLight
          position={[0.9, 0.7, 0.7]}
          intensity={0.8}
          color="#adccff"
        />
        <Suspense fallback={null}>
          <DeskPlatform />
          <Model onReady={onReady} controls={controls} />
          <ScreenDepthPlanes />
        </Suspense>
        <RenderFrame timerRef={timer} />
        {warm ? <ProgramHost /> : null}
        <AdaptiveResolution
          levels={levels}
          level={dpr}
          onStep={setDpr}
          timerRef={timer}
        />
        <Driver {...props} active={controls.active} running={running} />
      </Canvas>
      {!props.poster ? (
        <DeskObjectControls controls={controls} locale={props.locale} journey />
      ) : null}
    </>
  );
}

/**
 * R3F's Canvas reconfigures the renderer on every render, which also marks
 * the cached shadow maps dirty; the journey re-renders as chapters change
 * while scrolling, so the scene only re-renders when its own props do.
 */
export default memo(JourneyScene);
