"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import SceneBoundary from "@/components/three/scene-boundary";
import { useSectionStage } from "@/components/three/use-section-stage";
import { curtainOpening } from "@/lib/desk-story/curtain";
import { laptopPhase } from "@/lib/desk-story/store";
import styles from "./about.module.css";

const loadScene = () => import("./about-scene");
const AboutScene = dynamic(loadScene, { ssr: false });

/**
 * Mounts the About objects only near the section, never under reduced motion
 * or without WebGL2. The captured poster stays until the scene's first frame.
 */
export default function AboutStage({
  logos,
  arrival,
  wanted,
  visible,
}: {
  logos: string[];
  /** How far the page has arrived through the desk's curtain (0–1). */
  arrival?: number;
  /** Overrides for when the curtain, not an observer, decides. */
  wanted?: boolean;
  visible?: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement | null>(null);
  const logoList = useRef(logos);
  useEffect(() => {
    logoList.current = logos;
  }, [logos]);
  useEffect(() => {
    section.current = stage.current?.closest("section") ?? null;
  }, []);
  useEffect(() => {
    // Once the desk reaches the MacBook, the About scene is next: fetch its
    // code so it is ready before the page arrives.
    let idle = 0;
    const warm = () => {
      const phase = laptopPhase.get();
      if (phase !== "rise" && phase !== "gone") return;
      unsubscribe();
      // Then build its geometry a part at a time, so mounting it has
      // nothing left to build.
      idle = window.setTimeout(
        () =>
          void loadScene().then((scene) =>
            scene.prepareAbout(logoList.current),
          ),
        200,
      );
    };
    const unsubscribe = laptopPhase.subscribe(warm);
    warm();
    return () => {
      unsubscribe();
      window.clearTimeout(idle);
    };
  }, []);
  const { mount, active, paused, onReady, onFailure } = useSectionStage(stage, {
    id: "about",
    priority: 2,
    wanted,
    visible,
  });
  // Beneath the closed curtain About is in view as far as an observer can
  // tell, but the desk covers it: it mounts and warms up as before and
  // draws once the curtain opens.
  const exposed = useSyncExternalStore(
    curtainOpening.on,
    () => curtainOpening.get() > 0,
    () => true,
  );
  return (
    <div
      ref={stage}
      className={styles.stage}
      aria-hidden="true"
      data-about-stage
    >
      {mount ? (
        <SceneBoundary label="About scene" onFailure={onFailure}>
          <AboutScene
            active={active && exposed}
            paused={paused}
            logos={logos}
            sectionRef={section as RefObject<HTMLElement | null>}
            arrival={arrival}
            onReady={onReady}
            onFailure={onFailure}
          />
        </SceneBoundary>
      ) : null}
    </div>
  );
}
