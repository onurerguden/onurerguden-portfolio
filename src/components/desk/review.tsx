"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import assets from "@/lib/desk-assets.json";
import styles from "./review.module.css";

const Scene = dynamic(() => import("./scene"), { ssr: false });
const ids = ["wide", "portrait", "ultrawide", "macbook"] as const;
const copy = {
  en: {
    title: "A desk of my own",
    intro:
      "A study of my workspace, before it becomes the portfolio. Inspect the details and move between the three screens.",
    views: [
      "Whole desk",
      "Portrait monitor",
      "Ultrawide monitor",
      "MacBook Pro",
    ],
    range: "Camera journey",
    load: "Explore in 3D",
    loading: "Loading the desk…",
    static: "Static views",
    failure: "3D is unavailable. You can still inspect all four views.",
    reduced:
      "Reduced motion is enabled. Camera views change without animation.",
    details: "What to look for",
    detailViews: [
      "MX Master 3S",
      "Razer Barracuda and stand",
      "Metal monitor riser",
    ],
    notes: [
      "150 × 80 cm desk, with a black mat and both wrist rests.",
      "The Lenovo base sits on a separate metal riser with a mesh drawer.",
      "Xiaomi lightbar and dial, Barracuda headphones and MX Master 3S.",
      "Photo-based proportions; unspecified device housings are approximate.",
    ],
    sample: ["Selected work", "AI & research", "About & contact"],
    description:
      "A dark workspace with three monitors, a metal monitor riser, a laptop, headphones and warm desk lights.",
  },
  tr: {
    title: "Benim çalışma masam",
    intro:
      "Portföye dönüşmeden önce çalışma alanımın modelini inceliyoruz. Ayrıntılara bakabilir, üç ekran arasında geçiş yapabilirsin.",
    views: [
      "Masanın tamamı",
      "Dikey monitör",
      "Ultrawide monitör",
      "MacBook Pro",
    ],
    range: "Kamera yolculuğu",
    load: "3D olarak incele",
    loading: "Masa yükleniyor…",
    static: "Sabit görünümler",
    failure: "3D görüntülenemiyor. Dört açıyı görsellerden inceleyebilirsin.",
    reduced: "Hareket azaltma açık. Kamera açıları animasyonsuz değişir.",
    details: "İncelenecek ayrıntılar",
    detailViews: [
      "MX Master 3S",
      "Razer Barracuda ve standı",
      "Metal monitör yükselticisi",
    ],
    notes: [
      "150 × 80 cm masa, siyah mat ve iki bilek desteği.",
      "Lenovo tabanının altında ayrı metal yükseltici ve ağ çekmece.",
      "Xiaomi monitör lambası ve kumandası, Barracuda kulaklık ve MX Master 3S.",
      "Oranlar fotoğraflardan alındı; modeli belirtilmeyen cihaz kasaları yaklaşık.",
    ],
    sample: ["Seçili çalışmalar", "AI ve araştırma", "Hakkımda ve iletişim"],
    description:
      "Üç ekran, metal monitör yükselticisi, dizüstü bilgisayar, kulaklık ve sıcak masa ışıkları bulunan koyu bir çalışma alanı.",
  },
};

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function DeskReview({ locale }: { locale: "en" | "tr" }) {
  const t = copy[locale];
  const [progress, setProgress] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const index = Math.round(progress);
  const handleReady = useCallback(() => setReady(true), []);
  const handleFailure = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "100px" },
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      query.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  return (
    <main id="main" className={styles.review}>
      <header className={styles.header}>
        <div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <span className={styles.dimension}>150 × 80 cm</span>
      </header>
      <div className={styles.stage} ref={stage} data-desk-stage>
        <Image
          src={`/images/desk/${ids[index]}.webp?v=${assets.revision}`}
          alt={t.description}
          fill
          sizes="(max-width: 800px) 100vw, 1200px"
          className={styles.poster}
          priority
        />
        {enabled && !failed ? (
          <SceneBoundary onFailure={handleFailure}>
            <Scene
              revealed={ready}
              progress={progress}
              reduced={reduced}
              active={visible}
              locale={locale}
              onReady={handleReady}
              onFailure={handleFailure}
            />
          </SceneBoundary>
        ) : null}
        {!enabled && !failed ? (
          <button className={styles.launch} onClick={() => setEnabled(true)}>
            {t.load}
          </button>
        ) : null}
        {enabled && !ready && !failed ? (
          <p role="status" className={styles.loading}>
            {t.loading}
          </p>
        ) : null}
      </div>
      <div className={styles.controls}>
        <div className={styles.views} role="group" aria-label={t.range}>
          {t.views.map((view, i) => (
            <button
              key={view}
              aria-pressed={index === i}
              onClick={() => setProgress(i)}
            >
              {view}
            </button>
          ))}
        </div>
        <label className={styles.slider}>
          <span>{t.range}</span>
          <input
            name="camera-progress"
            type="range"
            min="0"
            max="3"
            step="0.01"
            value={progress}
            aria-valuetext={t.views[index]}
            onChange={(event) => setProgress(Number(event.target.value))}
          />
        </label>
        {enabled ? (
          <button
            className={styles.staticToggle}
            onClick={() => {
              setEnabled(false);
              setReady(false);
              setFailed(false);
            }}
          >
            {t.static}
          </button>
        ) : null}
      </div>
      <p className={styles.status} role="status">
        {failed ? t.failure : reduced ? t.reduced : t.views[index]}
      </p>
      <section className={styles.notes} aria-labelledby="desk-details">
        <h2 id="desk-details">{t.details}</h2>
        <ul>
          {t.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p>{t.sample.join(" / ")}</p>
      </section>
      <div className={styles.detailGallery}>
        {["mouse-detail", "headphones-detail", "riser-detail"].map((id, i) => (
          <figure key={id}>
            <a
              href={`/images/desk/${id}.webp?v=${assets.revision}`}
              aria-label={t.detailViews[i]}
            >
              <Image
                src={`/images/desk/${id}.webp?v=${assets.revision}`}
                alt={t.detailViews[i]}
                width={1280}
                height={960}
                sizes="(max-width: 700px) 90vw, 400px"
              />
            </a>
            <figcaption>{t.detailViews[i]}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
