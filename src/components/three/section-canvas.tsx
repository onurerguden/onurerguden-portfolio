"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type CanvasProps,
  type EventManager,
} from "@react-three/fiber";
import { quality } from "@/lib/quality";

/**
 * Section scenes listen to the page themselves and never use R3F's pointer
 * events. A no-op manager skips per-move raycasting and cannot fail when a
 * canvas is removed while it is still being created.
 */
const noEvents = (): EventManager<HTMLElement> => ({
  enabled: false,
  priority: 0,
  connect: () => {},
  disconnect: () => {},
});

/**
 * A scene that prepares itself (see warm-up.ts) calls this once it is warm;
 * until then its canvas draws nothing, since a frame drawn earlier would
 * compile shaders on the page's main thread.
 */
const WarmContext = createContext<() => void>(() => {});
export const useStageWarm = () => useContext(WarmContext);

type Props = {
  id: string;
  /** Visible, page visible and granted a context. */
  active: boolean;
  /** The visitor paused motion: keep the last frame, render nothing new. */
  paused: boolean;
  onFailure: () => void;
  /**
   * Frames per second while active for scenes that animate on their own
   * (e.g. floating objects). Omit for scenes that invalidate on demand.
   */
  fps?: number;
  className?: string;
  camera?: CanvasProps["camera"];
  orthographic?: boolean;
  /** How the canvas measures itself; see R3F's `resize` option. */
  resize?: CanvasProps["resize"];
  /** The scene reports when it is warm (useStageWarm); no frames before. */
  warmUp?: boolean;
  children: ReactNode;
};

/**
 * Canvas defaults shared by every section scene: decorative, demand-rendered,
 * DPR-capped and low-power, with the same per-frame counters as the journey.
 */
export default function SectionCanvas({
  id,
  active,
  paused,
  onFailure,
  fps,
  className,
  camera,
  orthographic,
  resize,
  warmUp = false,
  children,
}: Props) {
  const [warmed, setWarmed] = useState(!warmUp);
  const onWarm = useCallback(() => setWarmed(true), []);
  const running = active && !paused && warmed;
  const coarse = useMemo(
    () =>
      typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches,
    [],
  );
  // Integrated graphics draw at one device pixel, without multisampling.
  const low = useMemo(() => quality() === "low", []);
  return (
    <Canvas
      className={className}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      // At 1.25 on dense screens: the balls and About are soft shapes, and a
      // 120 Hz screen leaves them half the time (butter series, October 9).
      dpr={low ? 1 : [1, 1.25]}
      // The prop too, not only setFrameloop: R3F reapplies it whenever the
      // Canvas re-renders (a resize, say), which would restart a paused scene.
      frameloop={running ? "demand" : "never"}
      events={noEvents}
      orthographic={orthographic}
      camera={camera}
      // By its layout box, not getBoundingClientRect: a CSS transform on an
      // ancestor (an arrival scale, say) would otherwise resize the drawing
      // buffer and redraw every frame, and nothing here needs re-measuring
      // on scroll.
      resize={resize ?? { offsetSize: true, scroll: false }}
      gl={{ antialias: !low, alpha: true, powerPreference: "low-power" }}
    >
      <StageDriver
        id={id}
        running={running}
        active={active && warmed}
        onFailure={onFailure}
        fps={fps ? Math.min(fps, coarse ? 30 : 60) : undefined}
      />
      <WarmContext.Provider value={onWarm}>{children}</WarmContext.Provider>
    </Canvas>
  );
}

function StageDriver({
  id,
  running,
  active,
  onFailure,
  fps,
}: {
  id: string;
  running: boolean;
  active: boolean;
  onFailure: () => void;
  fps?: number;
}) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const advance = useThree((state) => state.advance);
  const setFrameloop = useThree((state) => state.setFrameloop);
  const getState = useThree((state) => state.get);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.dataset.stageCanvas = id;
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("tabindex", "-1");
    const lost = (event: Event) => {
      // Releasing a stage loses its context on purpose, after the canvas
      // has left the page; only a live canvas losing it is a failure.
      if (!canvas.isConnected) return;
      event.preventDefault();
      console.error(`${id} WebGL context lost`);
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, id, onFailure]);

  useEffect(() => {
    gl.domElement.dataset.stageActive = String(running);
    setFrameloop(running ? "demand" : "never");
    if (running) invalidate();
    else {
      // R3F's loop still draws frames invalidated before "never"; drop them
      // so a paused scene stops on exactly one finished still.
      getState().internal.frames = 0;
      if (active) advance(performance.now());
    }
  }, [running, active, gl, invalidate, advance, setFrameloop, getState]);

  useEffect(() => {
    if (!running || !fps) return;
    const interval = 1000 / fps;
    let last = 0;
    let frame = requestAnimationFrame(function tick(now) {
      if (now - last >= interval - 1) {
        last = now;
        invalidate();
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running, fps, invalidate]);

  useFrame(({ gl: renderer }) => {
    renderer.info.autoReset = false;
    renderer.info.reset();
  }, -2);
  useFrame(({ gl: renderer, scene, camera }) => {
    renderer.render(scene, camera);
    const canvas = renderer.domElement;
    canvas.dataset.stageFrames = String(
      Number(canvas.dataset.stageFrames || 0) + 1,
    );
    canvas.dataset.stageDrawCalls = String(renderer.info.render.calls);
    canvas.dataset.stageTriangles = String(renderer.info.render.triangles);
  }, 1);
  return null;
}
