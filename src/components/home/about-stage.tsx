"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, type RefObject } from "react";
import SceneBoundary from "@/components/three/scene-boundary";
import { useSectionStage } from "@/components/three/use-section-stage";
import styles from "./about.module.css";

const AboutScene = dynamic(() => import("./about-scene"), { ssr: false });

/**
 * Mounts the About objects only near the section, never under reduced motion
 * or without WebGL2. The static clay shapes stay until the scene is live.
 */
export default function AboutStage({ logos }: { logos: string[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement | null>(null);
  useEffect(() => {
    section.current = stage.current?.closest("section") ?? null;
  }, []);
  const { mount, active, paused, onReady, onFailure } = useSectionStage(stage, {
    id: "about",
    priority: 2,
  });
  return (
    <div ref={stage} className={styles.stage} aria-hidden="true">
      {mount ? (
        <SceneBoundary label="About scene" onFailure={onFailure}>
          <AboutScene
            active={active}
            paused={paused}
            logos={logos}
            sectionRef={section as RefObject<HTMLElement | null>}
            onReady={onReady}
            onFailure={onFailure}
          />
        </SceneBoundary>
      ) : null}
    </div>
  );
}
