"use client";

import { follow } from "@/lib/cursor";
import { useEffect, useRef } from "react";
import type { JourneyContent } from "@/lib/desk-story/content";
import styles from "./portrait.module.css";
import hintStyles from "./scroll-hint.module.css";

export default function PortraitIdentity({
  content,
  opening = false,
  interactive = true,
}: {
  content: Pick<JourneyContent, "name" | "role">;
  opening?: boolean;
  interactive?: boolean;
}) {
  const artworkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const artwork = artworkRef.current;
    if (
      !artwork ||
      !interactive ||
      !matchMedia(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      ).matches
    )
      return;

    let frame = 0;
    let visible = false;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;

    const reset = () => {
      targetX = 0;
      targetY = 0;
      if (!frame && document.visibilityState === "visible")
        frame = requestAnimationFrame(tick);
    };
    let last = 0;
    const tick = (now: number) => {
      frame = 0;
      // By time, not frames: a fixed share per frame moved twice as fast at
      // 120 Hz. The first frame after a rest counts as one at 60 Hz, so the
      // portrait never jumps a long idle gap's worth at once.
      const dt = last ? Math.min(now - last, 1000 / 60) : 1000 / 60;
      last = now;
      x = follow(x, targetX, dt, 70);
      y = follow(y, targetY, dt, 70);
      if (Math.abs(targetX - x) < 0.1) x = targetX;
      if (Math.abs(targetY - y) < 0.1) y = targetY;
      artwork.style.setProperty("--portrait-x", `${x.toFixed(2)}px`);
      artwork.style.setProperty("--portrait-y", `${y.toFixed(2)}px`);
      if (x !== targetX || y !== targetY) frame = requestAnimationFrame(tick);
      else last = 0;
    };
    const move = (event: PointerEvent) => {
      if (!visible || event.pointerType !== "mouse") return;
      const element = event.target instanceof Element ? event.target : null;
      if (element?.closest("nav, a, button")) return reset();
      const rect = artwork.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) return reset();
      const dx = (event.clientX - rect.left) / rect.width - 0.5;
      const dy = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = dx * Math.min(rect.width * 0.024, 48);
      targetY = dy * Math.min(rect.height * 0.036, 30);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) reset();
    });
    observer.observe(artwork);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
      cancelAnimationFrame(frame);
    };
  }, [interactive]);

  const words = content.name.split(" ");
  // The opening's name is the page's only h1; the ultrawide's copy of it is
  // decoration, hidden from assistive technology.
  const Name = opening ? "h1" : "div";
  const artwork = (
    <div
      ref={artworkRef}
      className={styles.artwork}
      data-portrait-identity
      aria-hidden={opening ? undefined : true}
    >
      <Name
        className={styles.name}
        data-portrait-name
        // The name is drawn as two stacked words; say it as one, with my role.
        aria-label={opening ? `${content.name}, ${content.role}` : undefined}
      >
        <span>{words[0]}</span>
        <span>{words.slice(1).join(" ")}</span>
      </Name>
      <span
        className={styles.role}
        data-portrait-role
        aria-hidden={opening ? true : undefined}
      >
        {content.role}
      </span>
      <div className={styles.head} data-portrait-poster>
        {/* AVIF at the same 1254 px, 152 KB instead of the WebP's 1.08 MB
            (PSNR 43.3 dB; docs/qa/desk-story/portrait-avif). */}
        <picture>
          <source type="image/avif" srcSet="/images/avatar/onur-head-v4.avif" />
          <img
            src="/images/avatar/onur-head-v4.webp"
            alt=""
            width={1254}
            height={1254}
            loading="eager"
            decoding="async"
            fetchPriority={opening ? "high" : "auto"}
          />
        </picture>
        {opening ? (
          // Just under the chin, so it never covers the face at any size.
          <span className={styles.hint} data-scroll-hint aria-hidden="true">
            <span className={hintStyles.hint} />
          </span>
        ) : null}
      </div>
    </div>
  );
  return opening ? (
    <div className={styles.opening} data-opening-poster>
      <div className={styles.openingScreen}>{artwork}</div>
    </div>
  ) : (
    artwork
  );
}
