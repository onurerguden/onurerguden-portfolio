"use client";

import { useEffect, useRef } from "react";
import { caughtUp, cursorLook, follow, type CursorLook } from "@/lib/cursor";
import styles from "./custom-cursor.module.css";

const finePointer = "(hover: hover) and (pointer: fine)";
const reducedMotion = "(prefers-reduced-motion: reduce)";

/** The dot is the system cursor's own image (src/styles/site.css). */
const dotImages = ["/images/cursor/dot.png", "/images/cursor/dot@2x.png"];

/**
 * A dot on the pointer and a ring that trails it, opening around anything
 * clickable. The dot is a cursor image the operating system draws, so it
 * never waits for the page; only the ring is drawn here. Mouse only: touch
 * and pens never see it, fields and grab areas keep the system's usual
 * cursor. Coordinates never touch React state.
 */
export default function CustomCursor() {
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ringNode = ring.current;
    if (!ringNode) return;
    const root = document.documentElement;
    const fine = matchMedia(finePointer);
    const reduced = matchMedia(reducedMotion);
    let enabled = fine.matches;
    // Loaded before the first move, so the dot never appears late.
    if (enabled)
      for (const src of dotImages) Object.assign(new Image(), { src });
    let x = 0;
    let y = 0;
    let ringX = 0;
    let ringY = 0;
    let target: Element | null = null;
    let shown = false;
    let look: CursorLook = "default";
    let frame = 0;
    let last = 0;
    let lookDirty = false;

    const setShown = (value: boolean) => {
      if (shown === value) return;
      shown = value;
      if (value) root.dataset.customCursor = "on";
      else delete root.dataset.customCursor;
      ringNode.dataset.shown = String(value);
    };
    const setLook = (value: CursorLook) => {
      if (look === value) return;
      look = value;
      ringNode.dataset.look = value;
    };
    const place = (node: HTMLElement, px: number, py: number) => {
      node.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    };
    const tick = (now: number) => {
      frame = 0;
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      if (lookDirty) {
        lookDirty = false;
        const next = cursorLook(target);
        setLook(next);
        setShown(next !== "native");
      }
      const halfLife = reduced.matches ? 0 : 45;
      ringX = follow(ringX, x, dt, halfLife);
      ringY = follow(ringY, y, dt, halfLife);
      place(ringNode, ringX, ringY);
      if (caughtUp(x - ringX, y - ringY)) {
        ringX = x;
        ringY = y;
        place(ringNode, x, y);
        last = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const move = (event: PointerEvent) => {
      if (!enabled) return;
      if (event.pointerType !== "mouse") {
        setShown(false);
        return;
      }
      x = event.clientX;
      y = event.clientY;
      if (!shown) {
        // Appear where the pointer is, not sliding in from the last exit.
        ringX = x;
        ringY = y;
      }
      target = event.target as Element | null;
      lookDirty = true;
      schedule();
    };
    // Scrolling moves the page under a still pointer.
    const scroll = () => {
      if (!enabled || !shown) return;
      target = document.elementFromPoint(x, y);
      lookDirty = true;
      schedule();
    };
    const press = (event: PointerEvent) => {
      if (event.pointerType === "mouse") ringNode.dataset.pressed = "true";
    };
    const release = () => {
      delete ringNode.dataset.pressed;
    };
    const leave = (event: MouseEvent) => {
      if (!event.relatedTarget) setShown(false);
    };
    const hide = () => setShown(false);
    const pointerChange = () => {
      enabled = fine.matches;
      if (!enabled) setShown(false);
    };

    const passive = { passive: true, capture: true } as const;
    window.addEventListener("pointermove", move, passive);
    window.addEventListener("pointerdown", press, passive);
    window.addEventListener("pointerup", release, passive);
    window.addEventListener("pointercancel", release, passive);
    window.addEventListener("scroll", scroll, passive);
    document.addEventListener("mouseout", leave);
    window.addEventListener("blur", hide);
    fine.addEventListener("change", pointerChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move, passive);
      window.removeEventListener("pointerdown", press, passive);
      window.removeEventListener("pointerup", release, passive);
      window.removeEventListener("pointercancel", release, passive);
      window.removeEventListener("scroll", scroll, passive);
      document.removeEventListener("mouseout", leave);
      window.removeEventListener("blur", hide);
      fine.removeEventListener("change", pointerChange);
      delete root.dataset.customCursor;
    };
  }, []);
  return (
    <div ref={ring} className={styles.ring} aria-hidden="true">
      <span />
    </div>
  );
}
