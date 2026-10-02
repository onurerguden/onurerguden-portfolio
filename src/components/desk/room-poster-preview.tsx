"use client";
import { useEffect, useRef } from "react";
import { useMotionValue } from "motion/react";
import type { JourneyContent } from "@/lib/desk-story/content";
import { storyAt } from "@/lib/desk-story/timeline";
import monitorStyles from "@/components/sections/monitor.module.css";
import xpStyles from "@/components/xp/xp.module.css";
import JourneyScene from "./journey-scene";
import ScreenPanels from "./screen-panels";
import { paintScreens } from "./paint-screens";
import { useStoryLayout } from "./use-story-layout";
import type { ScreenContent } from "./journey";
import styles from "./journey.module.css";
const noop = () => {};

/** The desk's final view, alone, for capturing the room poster. */
export default function RoomPosterPreview({
  locale,
  content,
  screens,
}: {
  locale: "en" | "tr";
  content: JourneyContent;
  screens: ScreenContent;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const { layout, measured } = useStoryLayout(true, wrapper, panels);
  const distance = useMotionValue(0);
  useEffect(() => {
    const end = measured.timeline.length;
    distance.set(end);
    paintScreens(measured, storyAt(measured.timeline, end), panels.current);
  }, [measured, distance]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20 }}>
      <div className={styles.scene} ref={wrapper}>
        <ScreenPanels
          panels={panels}
          content={content}
          interactive={false}
          monitor={
            <div className={monitorStyles.screen}>
              <section aria-labelledby="services-title">
                {screens.services}
              </section>
              <section aria-labelledby="experience-title">
                {screens.experience}
              </section>
            </div>
          }
          laptop={
            <section className={xpStyles.screen} aria-labelledby="stack-title">
              {screens.stack}
            </section>
          }
        />
        <JourneyScene
          poster
          distance={distance}
          active
          locale={locale}
          onReady={noop}
          onFailure={noop}
          wrapper={wrapper}
          panels={panels}
          layout={layout}
        />
      </div>
    </div>
  );
}
