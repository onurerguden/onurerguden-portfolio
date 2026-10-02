"use client";
import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import SceneBoundary from "@/components/three/scene-boundary";
import { useSectionStage } from "@/components/three/use-section-stage";
import { coverFrame } from "@/lib/bliss-geometry";
import { laptopPhase } from "@/lib/desk-story/store";
import { unprojectPoint } from "@/lib/desk-projection";
import type { BallItem } from "./tech-atlas";
import { dropEvent } from "./xp-drop";
import { ballAt, drop, sim } from "./xp-sim";
import styles from "./xp.module.css";

const XpScene = dynamic(() => import("./xp-scene"), { ssr: false });
const NARROW_BALLS = 18;

type Box = { width: number; height: number; left: number; top: number };

/** The desktop point under a pointer, through the panel's projection. */
function desktopPoint(desktop: HTMLElement, x: number, y: number) {
  const panel = desktop.closest<HTMLElement>("[data-screen]");
  const layer = panel?.parentElement;
  if (!panel || !layer) return null;
  const transform = getComputedStyle(panel).transform;
  const matrix =
    transform && transform !== "none"
      ? new DOMMatrix(transform).toFloat64Array()
      : new DOMMatrix().toFloat64Array();
  const origin = layer.getBoundingClientRect();
  const local = unprojectPoint(matrix, x - origin.left, y - origin.top);
  if (!local) return null;
  // The desktop fills its panel, less any offset inside it.
  return { x: local.x - desktop.offsetLeft, y: local.y - desktop.offsetTop };
}

/**
 * The technology balls on the MacBook. They only exist on the projected
 * screen (or its takeover); in the page the Explorer list stands alone.
 * Hovering a settled ball, or tapping it, names it in an XP balloon.
 */
export default function XpBalls({
  items,
  locale,
}: {
  items: BallItem[];
  locale: "en" | "tr";
}) {
  const en = locale === "en";
  const holder = useRef<HTMLDivElement>(null);
  const [desktop, setDesktop] = useState<HTMLElement | null>(null);
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [selected, setSelected] = useState<{
    index: number;
    pinned: boolean;
  } | null>(null);
  const phase = useSyncExternalStore(
    laptopPhase.subscribe,
    laptopPhase.get,
    () => "away" as const,
  );

  // Only a desktop on a screen gets balls.
  useEffect(() => {
    const node = holder.current?.closest<HTMLElement>("[data-xp]") ?? null;
    if (!node?.closest("[data-screen]")) return;
    setDesktop(node);
    setOverlay(node.querySelector<HTMLElement>("[data-xp-overlay]"));
    const measure = () => {
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      const frame = coverFrame(width, height);
      setBox((previous) =>
        previous?.width === width && previous.height === height
          ? previous
          : { width, height, left: -frame.x, top: -frame.y },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const narrow = (box?.width ?? 1280) < 700;
  const chosen = useMemo(() => {
    if (!narrow) return items;
    return [
      ...items.filter((item) => item.priority === 1),
      ...items.filter((item) => item.priority === 2),
    ].slice(0, NARROW_BALLS);
  }, [items, narrow]);

  const { mount, active, paused, onReady, onFailure } = useSectionStage(
    holder,
    {
      id: "desk-stack",
      priority: 2,
      visible: phase === "desk" || phase === "rise",
      wanted: phase === "near" || phase === "desk" || phase === "rise",
    },
  );

  // A selection belongs to the settled pile on the desktop.
  const shown = phase === "desk" ? selected : null;
  useEffect(() => {
    sim.selected = shown?.index ?? -1;
    sim.invalidate();
  }, [shown]);

  useEffect(() => {
    if (!desktop || !mount) return;
    const panel = desktop.closest<HTMLElement>("[data-screen]")!;
    const excluded = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(target.closest("a, button, [data-no-physics], [data-balloon]"));
    const pick = (event: PointerEvent) => {
      const point = desktopPoint(desktop, event.clientX, event.clientY);
      return point ? ballAt(point.x, point.y) : -1;
    };
    const hover = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      setSelected((current) => {
        if (current?.pinned) return current;
        const index = excluded(event.target) ? -1 : pick(event);
        if (index < 0) return null;
        return current?.index === index ? current : { index, pinned: false };
      });
    };
    let down: { x: number; y: number; t: number } | null = null;
    const press = (event: PointerEvent) => {
      down = excluded(event.target)
        ? null
        : { x: event.clientX, y: event.clientY, t: performance.now() };
    };
    // A tap (or click) pins the balloon so its links can be used; a tap on
    // the empty desktop closes it.
    const release = (event: PointerEvent) => {
      if (!down) return;
      const tap =
        performance.now() - down.t < 400 &&
        Math.hypot(event.clientX - down.x, event.clientY - down.y) < 10;
      down = null;
      if (!tap) return;
      const index = pick(event);
      setSelected(index < 0 ? null : { index, pinned: true });
    };
    const leave = () =>
      setSelected((current) => (current?.pinned ? current : null));
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    panel.addEventListener("pointermove", hover, { passive: true });
    panel.addEventListener("pointerdown", press, { passive: true });
    panel.addEventListener("pointerup", release, { passive: true });
    panel.addEventListener("pointerleave", leave);
    window.addEventListener("keydown", key);
    return () => {
      panel.removeEventListener("pointermove", hover);
      panel.removeEventListener("pointerdown", press);
      panel.removeEventListener("pointerup", release);
      panel.removeEventListener("pointerleave", leave);
      window.removeEventListener("keydown", key);
    };
  }, [desktop, mount]);

  useEffect(() => {
    const again = () => {
      if (laptopPhase.get() === "desk") drop(true);
    };
    window.addEventListener(dropEvent, again);
    return () => window.removeEventListener(dropEvent, again);
  }, []);

  const world = sim.world;
  const item = shown ? chosen[shown.index] : null;
  const balloon =
    item && world && overlay && shown
      ? createPortal(
          <div
            className={styles.balloon}
            data-balloon
            data-pinned={shown.pinned}
            role="status"
            style={{
              left: world.px[shown.index],
              top: world.py[shown.index] - world.radii[shown.index] * 1.25,
            }}
          >
            <strong>{item.name}</strong>
            <span className={styles.balloonCategory}>{item.category}</span>
            {item.evidence.length ? (
              <span className={styles.balloonUsed}>
                {en ? "Used in " : "Kullanıldığı yer: "}
                {item.evidence.map((proof, i) => (
                  <span key={proof.href}>
                    {i ? ", " : null}
                    <a href={proof.href} tabIndex={shown.pinned ? 0 : -1}>
                      {proof.label}
                    </a>
                  </span>
                ))}
              </span>
            ) : null}
          </div>,
          overlay,
        )
      : null;

  return (
    <div
      ref={holder}
      className={styles.ballsHolder}
      aria-hidden="true"
      style={box ?? undefined}
    >
      {mount && box ? (
        <SceneBoundary label="Tech stack balls" onFailure={onFailure}>
          <XpScene
            key={narrow ? "narrow" : "wide"}
            items={chosen}
            phase={phase}
            active={active}
            paused={paused}
            onReady={onReady}
            onFailure={onFailure}
          />
        </SceneBoundary>
      ) : null}
      {balloon}
    </div>
  );
}
