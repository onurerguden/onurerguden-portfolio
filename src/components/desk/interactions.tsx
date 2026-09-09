"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createDeskAudio, deskTrack, type AudioStatus } from "@/lib/desk-audio";
import { lampColors } from "@/lib/desk-interaction-motion";
import styles from "./interactions.module.css";

export type DeskAction = "dial" | "headphones" | "lamp" | "mouse" | "tablet";
export type InteractionPoint = [number, number, number];
const copy = {
  en: {
    title: "Desk objects",
    dial: "Desk lights",
    headphones: "Headphones",
    lamp: "Lamp color",
    mouse: "Play with the mouse",
    tablet: "Move the pencil",
    colors: ["Amber", "Pink", "Purple", "Blue", "Green"],
    hint: "Click a desk object or use these buttons.",
    idle: "Music starts only when you select the headphones.",
    loading: "Loading music…",
    playing: "Music playing. Select the headphones to pause.",
    paused: "Music paused.",
    missing: "Music has not been added yet.",
    error: "Music could not play. Select the headphones to try again.",
  },
  tr: {
    title: "Masa objeleri",
    dial: "Masa ışıkları",
    headphones: "Kulaklık",
    lamp: "Lamba rengi",
    mouse: "Mouse ile oyna",
    tablet: "Kalemi hareket ettir",
    colors: ["Amber", "Pembe", "Mor", "Mavi", "Yeşil"],
    hint: "Masa objelerine tıkla veya bu düğmeleri kullan.",
    idle: "Müzik yalnızca kulaklığı seçtiğinde başlar.",
    loading: "Müzik yükleniyor…",
    playing: "Müzik çalıyor. Duraklatmak için kulaklığı seç.",
    paused: "Müzik duraklatıldı.",
    missing: "Müzik henüz eklenmedi.",
    error: "Müzik çalınamadı. Yeniden denemek için kulaklığı seç.",
  },
};

export function useDeskInteractions(active: boolean, reduced: boolean) {
  const [lights, setLights] = useState(true);
  const [colorIndex, setColorIndex] = useState(1);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [visible, setVisible] = useState(true);
  const motion = useRef<(action: DeskAction, point?: InteractionPoint) => void>(
    () => {},
  );
  const audio = useRef<ReturnType<typeof createDeskAudio> | null>(null);
  const registerMotion = useCallback((handler: typeof motion.current) => {
    motion.current = handler;
    return () => {
      motion.current = () => {};
    };
  }, []);
  useEffect(() => {
    const player = createDeskAudio(deskTrack, setAudioStatus);
    audio.current = player;
    const visibility = () => {
      setVisible(!document.hidden);
      if (document.hidden) player.pause();
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      player.dispose();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    if (!active) audio.current?.pause();
  }, [active]);
  const activate = useCallback(
    (action: DeskAction, point?: InteractionPoint) => {
      if (!active || !visible) return;
      if (action === "dial") setLights((value) => !value);
      if (action === "lamp")
        setColorIndex((value) => (value + 1) % lampColors.length);
      if (action === "headphones") audio.current?.toggle();
      motion.current(action, point);
    },
    [active, visible],
  );
  return {
    lights,
    colorIndex,
    audioStatus,
    active: active && visible,
    reduced,
    registerMotion,
    activate,
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
        </div>
        <p className={styles.status}>{t.hint}</p>
        <p role="status" className={styles.status}>
          {t[controls.audioStatus]}
          {controls.audioStatus === "playing" && deskTrack.title
            ? ` ${deskTrack.title}`
            : ""}
        </p>
      </div>
    </details>
  );
}
