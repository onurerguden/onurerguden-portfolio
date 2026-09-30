"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import SceneBoundary from "@/components/three/scene-boundary";
import { useSectionStage } from "@/components/three/use-section-stage";
import { coverFrame } from "@/lib/bliss-geometry";
import type { BallItem } from "./tech-atlas";
import styles from "./stack.module.css";

const StackScene = dynamic(() => import("./stack-scene"), { ssr: false });
const MOBILE_BALLS = 18;

/**
 * Places the ball canvas exactly over the visible stage inside the photo
 * frame (which overhangs the stage in cover mode) and mounts the scene only
 * near the section.
 */
export default function StackBalls({ items }: { items: BallItem[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement | null>(null);
  const track = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
  } | null>(null);
  useEffect(() => {
    stage.current = holder.current?.closest("[data-stack-stage]") ?? null;
    track.current = holder.current?.closest("[data-stack-track]") ?? null;
    const node = stage.current;
    if (!node) return;
    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      const frame = coverFrame(width, height);
      setBox({ width, height, left: -frame.x, top: -frame.y });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const narrow = (box?.width ?? 1024) < 700;
  const chosen = useMemo(() => {
    const wanted = items.filter((item) => item.priority <= 2);
    if (!narrow) return wanted;
    return [
      ...wanted.filter((item) => item.priority === 1),
      ...wanted.filter((item) => item.priority === 2),
    ].slice(0, MOBILE_BALLS);
  }, [items, narrow]);
  const { mount, active, paused, onReady, onFailure } = useSectionStage(
    holder,
    { id: "stack", priority: 2 },
  );
  return (
    <div
      ref={holder}
      className={styles.ballsHolder}
      aria-hidden="true"
      style={box ?? undefined}
    >
      {mount && box ? (
        <SceneBoundary label="Tech stack balls" onFailure={onFailure}>
          <StackScene
            key={narrow ? "narrow" : "wide"}
            items={chosen}
            active={active}
            paused={paused}
            trackRef={track as RefObject<HTMLElement | null>}
            stageRef={stage as RefObject<HTMLElement | null>}
            onReady={onReady}
            onFailure={onFailure}
          />
        </SceneBoundary>
      ) : null}
    </div>
  );
}
