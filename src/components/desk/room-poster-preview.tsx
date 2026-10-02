"use client";
import { useRef } from "react";
import { useMotionValue } from "motion/react";
import type { JourneyContent } from "@/lib/desk-story/content";
import monitorStyles from "@/components/sections/monitor.module.css";
import JourneyScene from "./journey-scene";
import ScreenPanels from "./screen-panels";
import { useStoryLayout } from "./use-story-layout";
import type { MonitorContent } from "./journey";
import styles from "./journey.module.css";
const noop = () => {};

/** The desk's final view, alone, for capturing the room poster. */
export default function RoomPosterPreview({
  locale,
  content,
  monitor,
}: {
  locale: "en" | "tr";
  content: JourneyContent;
  monitor: MonitorContent;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const { layout, measured } = useStoryLayout(true, wrapper, panels);
  const distance = useMotionValue(0);
  distance.set(measured.timeline.length);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20 }}>
      <div className={styles.scene} ref={wrapper}>
        <ScreenPanels
          panels={panels}
          content={content}
          interactive={false}
          laptop={false}
          monitor={
            <div className={monitorStyles.screen}>
              <section aria-labelledby="services-title">
                {monitor.services}
              </section>
              <section aria-labelledby="experience-title">
                {monitor.experience}
              </section>
            </div>
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
