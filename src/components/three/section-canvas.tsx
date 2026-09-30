"use client";
import { useEffect, useMemo, type ReactNode } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type CanvasProps,
} from "@react-three/fiber";

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
  children,
}: Props) {
  const coarse = useMemo(
    () =>
      typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches,
    [],
  );
  return (
    <Canvas
      className={className}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      dpr={coarse ? [1, 1.25] : [1, 1.5]}
      frameloop="demand"
      orthographic={orthographic}
      camera={camera}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <StageDriver
        id={id}
        running={active && !paused}
        active={active}
        onFailure={onFailure}
        fps={fps ? Math.min(fps, coarse ? 30 : 60) : undefined}
      />
      {children}
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

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.dataset.stageCanvas = id;
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("tabindex", "-1");
    const lost = (event: Event) => {
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
    // Pausing keeps a finished still rather than a half-drawn buffer.
    else if (active) advance(performance.now());
  }, [running, active, gl, invalidate, advance, setFrameloop]);

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
