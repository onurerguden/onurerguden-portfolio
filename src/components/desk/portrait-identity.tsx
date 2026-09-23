"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { JourneyContent } from "@/lib/desk-journey";
import styles from "./portrait.module.css";

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
    const tick = () => {
      frame = 0;
      x += (targetX - x) * 0.16;
      y += (targetY - y) * 0.16;
      if (Math.abs(targetX - x) < 0.1) x = targetX;
      if (Math.abs(targetY - y) < 0.1) y = targetY;
      artwork.style.setProperty("--portrait-x", `${x.toFixed(2)}px`);
      artwork.style.setProperty("--portrait-y", `${y.toFixed(2)}px`);
      if (x !== targetX || y !== targetY) frame = requestAnimationFrame(tick);
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
  const artwork = (
    <div
      ref={artworkRef}
      className={styles.artwork}
      data-portrait-identity
      aria-hidden="true"
    >
      <div className={styles.name}>
        <span>{words[0]}</span>
        <span>{words.slice(1).join(" ")}</span>
      </div>
      <span className={styles.role}>{content.role}</span>
      <div className={styles.head} data-portrait-poster>
        <Image
          src="/images/avatar/onur-head.webp"
          alt=""
          fill
          sizes="(max-width: 700px) 100vw, 45vw"
          loading="eager"
          fetchPriority={opening ? "high" : "auto"}
        />
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
