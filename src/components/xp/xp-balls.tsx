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
import { unprojectPoint } from "@/lib/screen-geometry";
import type { BallItem } from "./tech-atlas";
import { dropEvent } from "./xp-drop";
import {
  ballAt,
  drop,
  grabBall,
  moveBall,
  nudgeBall,
  releaseBall,
  sim,
} from "./xp-sim";
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
 * Hovering a settled ball, or tapping it, names it in an XP balloon. A
 * primary-button drag moves it; native controls offer the same gentle nudge.
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
  const [controls, setControls] = useState<HTMLElement | null>(null);
  const [controlIndex, setControlIndex] = useState(0);
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
    setControls(node.querySelector<HTMLElement>("[data-ball-controls]"));
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
    if (!desktop || !mount || phase !== "desk") return;
    const panel = desktop.closest<HTMLElement>("[data-screen]")!;
    const excluded = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(target.closest("a, button, [data-no-physics], [data-balloon]"));
    const pick = (event: PointerEvent) => {
      const point = desktopPoint(desktop, event.clientX, event.clientY);
      return point ? ballAt(point.x, point.y) : -1;
    };
    // High-frequency coordinates belong to this listener, never React state.
    let down: {
      x: number;
      y: number;
      t: number;
      pointerId: number;
      index: number;
      point: { x: number; y: number } | null;
      dragged: boolean;
    } | null = null;
    const finish = (cancel = false) => {
      const previous = down;
      down = null;
      if (previous?.dragged) releaseBall(cancel);
      if (previous && panel.hasPointerCapture(previous.pointerId))
        panel.releasePointerCapture(previous.pointerId);
      delete desktop.dataset.ballDragging;
      delete desktop.dataset.ballGrabbable;
    };
    const hover = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (
        down?.pointerId === event.pointerId &&
        down.index >= 0 &&
        !paused &&
        active
      ) {
        if (!(event.buttons & 1)) {
          finish(true);
          return;
        }
        const point = desktopPoint(desktop, event.clientX, event.clientY);
        if (!point) {
          finish(true);
          return;
        }
        if (
          !down.dragged &&
          down.point &&
          Math.hypot(event.clientX - down.x, event.clientY - down.y) >= 4
        ) {
          if (!grabBall(down.index, down.point.x, down.point.y)) {
            finish(true);
            return;
          }
          down.dragged = true;
          panel.setPointerCapture(event.pointerId);
          desktop.dataset.ballDragging = "true";
          setSelected(null);
        }
        if (down.dragged) {
          if (sim.world?.draggedIndex !== down.index) {
            finish(true);
            return;
          }
          event.preventDefault();
          moveBall(point.x, point.y);
          return;
        }
      }
      const index = excluded(event.target) ? -1 : pick(event);
      desktop.dataset.ballGrabbable = String(index >= 0 && !paused && active);
      setSelected((current) => {
        if (current?.pinned) return current;
        if (index < 0) return null;
        return current?.index === index ? current : { index, pinned: false };
      });
    };
    const press = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary || excluded(event.target))
        return;
      const point = desktopPoint(desktop, event.clientX, event.clientY);
      const index = point ? ballAt(point.x, point.y) : -1;
      down = {
        x: event.clientX,
        y: event.clientY,
        t: performance.now(),
        pointerId: event.pointerId,
        index,
        point,
        dragged: false,
      };
      // Touch keeps native vertical scrolling; only a held mouse/pen ball
      // suppresses text selection, leaving links and the taskbar untouched.
      if (index >= 0 && event.pointerType !== "touch" && !paused && active)
        event.preventDefault();
    };
    // A tap (or click) pins the balloon so its links can be used; a tap on
    // the empty desktop closes it.
    const release = (event: PointerEvent) => {
      if (!down || down.pointerId !== event.pointerId) return;
      if (down.dragged) {
        finish();
        return;
      }
      const tap =
        performance.now() - down.t < 400 &&
        Math.hypot(event.clientX - down.x, event.clientY - down.y) < 10;
      finish();
      if (!tap) return;
      const index = pick(event);
      setSelected(index < 0 ? null : { index, pinned: true });
    };
    const leave = () => {
      if (down?.dragged) return;
      delete desktop.dataset.ballGrabbable;
      setSelected((current) => (current?.pinned ? current : null));
    };
    const cancel = () => finish(true);
    const lost = (event: PointerEvent) => {
      if (down?.pointerId === event.pointerId) cancel();
    };
    const hidden = () => {
      if (document.hidden) cancel();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancel();
        setSelected(null);
      }
    };
    panel.addEventListener("pointermove", hover);
    panel.addEventListener("pointerdown", press);
    panel.addEventListener("pointerup", release, { passive: true });
    panel.addEventListener("pointercancel", cancel);
    panel.addEventListener("lostpointercapture", lost);
    panel.addEventListener("pointerleave", leave);
    window.addEventListener("keydown", key);
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    window.addEventListener(dropEvent, cancel);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancel();
      panel.removeEventListener("pointermove", hover);
      panel.removeEventListener("pointerdown", press);
      panel.removeEventListener("pointerup", release);
      panel.removeEventListener("pointercancel", cancel);
      panel.removeEventListener("lostpointercapture", lost);
      panel.removeEventListener("pointerleave", leave);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      window.removeEventListener(dropEvent, cancel);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [desktop, mount, phase, paused, active]);

  useEffect(() => {
    const again = () => {
      if (laptopPhase.get() === "desk") drop(true);
    };
    window.addEventListener(dropEvent, again);
    return () => window.removeEventListener(dropEvent, again);
  }, []);

  const world = sim.world;
  const movingIndex = Math.max(0, Math.min(controlIndex, chosen.length - 1));
  const moveControls =
    controls && mount && phase === "desk"
      ? createPortal(
          <div className={styles.ballMoves} data-no-physics>
            <select
              aria-label={
                en ? "Choose a ball to move" : "Hareket ettirilecek topu seç"
              }
              value={movingIndex}
              onChange={(event) => {
                const index = Number(event.target.value);
                setControlIndex(index);
                setSelected({ index, pinned: true });
              }}
            >
              {chosen.map((ball, index) => (
                <option key={ball.id} value={index}>
                  {ball.name}
                </option>
              ))}
            </select>
            {([-1, 1] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                disabled={paused || !active}
                aria-label={
                  en
                    ? `Move ${chosen[movingIndex]?.name ?? "ball"} ${direction < 0 ? "left" : "right"}`
                    : `${chosen[movingIndex]?.name ?? "Top"} topunu ${direction < 0 ? "sola" : "sağa"} hareket ettir`
                }
                onClick={() => {
                  if (!paused && active && nudgeBall(movingIndex, direction))
                    setSelected(null);
                }}
              >
                <span aria-hidden="true">{direction < 0 ? "←" : "→"}</span>
              </button>
            ))}
          </div>,
          controls,
        )
      : null;
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
      {moveControls}
    </div>
  );
}
