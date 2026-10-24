"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { deskMusic, type MusicStatus } from "@/lib/desk-music";
import { attachMusicPill } from "@/lib/music-pill";
import { qa } from "@/lib/qa";
import { initialLampColor, lampColors } from "@/lib/desk-interaction-motion";
import styles from "./interactions.module.css";

export type DeskAction =
  "dial" | "headphones" | "lamp" | "mouse" | "tablet" | "drawers";
export type InteractionPoint = [number, number, number];
export const deskActions = [
  "headphones",
  "drawers",
  "lamp",
  "dial",
  "tablet",
  "mouse",
] as const satisfies readonly DeskAction[];
const copy = {
  en: {
    title: "Desk objects",
    dial: "Desk lights",
    headphones: "Headphones",
    lamp: "Lamp color",
    mouse: "Play with the mouse",
    tablet: "Move the pencil",
    drawers: "Wave the drawers",
    colors: ["Amber", "Pink", "Purple", "Blue", "Green"],
    hint: "Click a desk object or use these buttons.",
    idle: "Music starts only when you select the headphones.",
    loading: "Loading music…",
    playing: "Music playing. Select the headphones to pause.",
    paused: "Music paused.",
    error: "Music could not play. Select the headphones to try again.",
  },
  tr: {
    title: "Masa objeleri",
    dial: "Masa ışıkları",
    headphones: "Kulaklık",
    lamp: "Lamba rengi",
    mouse: "Mouse ile oyna",
    tablet: "Kalemi hareket ettir",
    drawers: "Çekmece dalgası",
    colors: ["Amber", "Pembe", "Mor", "Mavi", "Yeşil"],
    hint: "Masa objelerine tıkla veya bu düğmeleri kullan.",
    idle: "Müzik yalnızca kulaklığı seçtiğinde başlar.",
    loading: "Müzik yükleniyor…",
    playing: "Müzik çalıyor. Duraklatmak için kulaklığı seç.",
    paused: "Müzik duraklatıldı.",
    error: "Müzik çalınamadı. Yeniden denemek için kulaklığı seç.",
  },
};

export function useDeskInteractions(active: boolean, reduced: boolean) {
  const [lights, setLights] = useState(true);
  const [colorIndex, setColorIndex] = useState(initialLampColor);
  // The music outlives this scene: it plays on past the desk (desk-music.ts).
  const audioStatus = useSyncExternalStore<MusicStatus>(
    (listener) => deskMusic().subscribe(listener),
    () => deskMusic().status(),
    () => "idle",
  );
  const [visible, setVisible] = useState(true);
  const motion = useRef<
    (action: DeskAction, point?: InteractionPoint, tease?: boolean) => void
  >(() => {});
  // What the visitor has clicked this visit: teases go to the others.
  const touched = useRef(new Set<DeskAction>());
  const registerMotion = useCallback((handler: typeof motion.current) => {
    motion.current = handler;
    return () => {
      motion.current = () => {};
    };
  }, []);
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  const activate = useCallback(
    (action: DeskAction, point?: InteractionPoint) => {
      if (!active || !visible) return;
      if (action === "dial") setLights((value) => !value);
      if (action === "lamp")
        setColorIndex((value) => (value + 1) % lampColors.length);
      if (action === "headphones") {
        const music = deskMusic();
        music.toggle();
        attachMusicPill(music, qa());
      }
      touched.current.add(action);
      motion.current(action, point);
    },
    [active, visible],
  );
  /** A hint that an object can be clicked; it changes nothing. */
  const tease = useCallback(
    (action: DeskAction) => {
      if (active && visible && !reduced)
        motion.current(action, undefined, true);
    },
    [active, visible, reduced],
  );
  const untouched = useCallback(
    () => deskActions.filter((action) => !touched.current.has(action)),
    [],
  );
  return {
    lights,
    colorIndex,
    audioStatus,
    active: active && visible,
    reduced,
    registerMotion,
    activate,
    tease,
    untouched,
  };
}
export type DeskInteractions = ReturnType<typeof useDeskInteractions>;

export function DeskObjectControls({
  controls,
  locale,
  journey = false,
}: {
  controls: DeskInteractions;
  locale: "en" | "tr";
  journey?: boolean;
}) {
  const t = copy[locale];
  return (
    <details
      className={styles.controls}
      data-journey={journey}
      data-cosmic-exclusion="true"
      open={controls.audioStatus !== "idle"}
    >
      <summary>{t.title}</summary>
      <div className={styles.panel}>
        <div className={styles.buttons}>
          <button
            type="button"
            data-desk-action="dial"
            aria-pressed={controls.lights}
            onClick={() => controls.activate("dial")}
          >
            {t.dial}
          </button>
          <button
            type="button"
            data-desk-action="headphones"
            aria-pressed={
              controls.audioStatus === "playing" ||
              controls.audioStatus === "loading"
            }
            onClick={() => controls.activate("headphones")}
          >
            {t.headphones}
          </button>
          <button
            type="button"
            data-desk-action="lamp"
            onClick={() => controls.activate("lamp")}
          >
            {t.lamp}: {t.colors[controls.colorIndex]}
          </button>
          <button
            type="button"
            data-desk-action="mouse"
            onClick={() => controls.activate("mouse")}
          >
            {t.mouse}
          </button>
          <button
            type="button"
            data-desk-action="tablet"
            onClick={() => controls.activate("tablet")}
          >
            {t.tablet}
          </button>
          <button
            type="button"
            data-desk-action="drawers"
            onClick={() => controls.activate("drawers")}
          >
            {t.drawers}
          </button>
        </div>
        <p className={styles.status}>{t.hint}</p>
        <p role="status" className={styles.status}>
          {t[controls.audioStatus]}
          {controls.audioStatus === "playing" ? ` ${deskMusic().title}` : ""}
        </p>
      </div>
    </details>
  );
}
