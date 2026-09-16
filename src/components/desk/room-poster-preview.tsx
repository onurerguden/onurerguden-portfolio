"use client";
import { useMotionValue } from "motion/react";
import JourneyScene from "./journey-scene";
import type { JourneyContent } from "@/lib/desk-journey";
const noop = () => {};
export default function RoomPosterPreview({
  locale,
  content,
}: {
  locale: "en" | "tr";
  content: JourneyContent;
}) {
  const distance = useMotionValue(8.5);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20 }}>
      <JourneyScene
        poster
        distance={distance}
        active
        content={content}
        locale={locale}
        onReady={noop}
        onFailure={noop}
        onFocusCard={noop}
      />
    </div>
  );
}
