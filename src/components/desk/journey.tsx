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
import { useScroll, useMotionValueEvent, useMotionValue } from "motion/react";
import {
  focusDistance,
  journeyAt,
  journeyLength,
  type JourneyContent,
} from "@/lib/desk-journey";
import assets from "@/lib/desk-assets.json";
import styles from "./journey.module.css";
const Scene = dynamic(() => import("./journey-scene"), { ssr: false });
class Boundary extends Component<
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
export default function DeskJourney({
  locale,
  content,
}: {
  locale: "en" | "tr";
  content: JourneyContent;
}) {
  const en = locale === "en";
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const fallbackTarget = useRef(-1);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [failed, setFailed] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  const [chapter, setChapter] = useState(-1);
  const chapterRef = useRef(-1);
  const distance = useMotionValue(0);
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });
  const update = useCallback(
    (value: number) => {
      if (section.current?.dataset.enhanced !== "true") return;
      const d = value * journeyLength;
      distance.set(d);
      const state = journeyAt(d);
      if (chapterRef.current !== state.active) {
        chapterRef.current = state.active;
        setChapter(state.active);
      }
      if (intro.current) {
        intro.current.style.opacity = String(1 - Math.min(1, d / 0.5));
        intro.current.style.visibility = d >= 0.5 ? "hidden" : "visible";
      }
    },
    [distance],
  );
  useMotionValueEvent(scrollYProgress, "change", update);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const refresh = () => {
      setStaticMode(motion.matches);
      if (motion.matches) setEnabled(false);
    };
    refresh();
    motion.addEventListener("change", refresh);
    const observer = new IntersectionObserver(([entry]) => {
      setActive(entry.isIntersecting);
      if (entry.isIntersecting && !motion.matches) setEnabled(true);
    });
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", refresh);
    };
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => {
    fallbackTarget.current = Math.max(0, journeyAt(distance.get()).to - 1);
    setFailed(true);
    setReady(false);
  }, [distance]);
  const enhanced = enabled && !staticMode && !failed;
  useEffect(() => {
    if (!enhanced && intro.current) {
      intro.current.style.opacity = "1";
      intro.current.style.visibility = "visible";
      if (fallbackTarget.current >= 0) {
        const target = document.getElementById(
          `desk-story-${fallbackTarget.current}`,
        );
        target?.scrollIntoView({ behavior: "instant", block: "start" });
        target?.focus({ preventScroll: true });
        fallbackTarget.current = -1;
      }
    }
  }, [enhanced]);
  useEffect(() => {
    if (!enhanced || ready) return;
    const timeout = window.setTimeout(onFailure, 12000);
    return () => window.clearTimeout(timeout);
  }, [enhanced, ready, onFailure]);
  const jump = useCallback(
    (screen: number, card = 0) => {
      if (!enhanced) return;
      const node = section.current;
      if (!node) return;
      const y = node.getBoundingClientRect().top + window.scrollY;
      const d = focusDistance(screen, card, content.screens[screen].length);
      const span =
        node.offsetHeight - (stage.current?.offsetHeight || window.innerHeight);
      window.scrollTo({
        top: y + (span * d) / journeyLength,
        behavior: "instant",
      });
      distance.set(d);
    },
    [enhanced, content, distance],
  );
  useEffect(() => {
    if (!ready || !enhanced) return;
    const restore = () => {
      const match = location.hash.match(/^#desk-story-([0-2])$/);
      if (match) jump(Number(match[1]));
    };
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, [ready, enhanced, jump]);
  return (
    <section
      ref={section}
      className={styles.journey}
      data-enhanced={enhanced}
      data-ready={ready}
      aria-label={en ? "From my desk to my work" : "Masamdan çalışmalarıma"}
    >
      <div className={styles.stage} ref={stage} data-journey-stage>
        <Image
          src={`/images/desk/wide.webp?v=${assets.revision}`}
          alt={
            en
              ? "My desk with three screens and warm lighting"
              : "Üç ekran ve sıcak ışıklarla çalışma masam"
          }
          fill
          priority
          sizes="100vw"
          className={styles.poster}
        />
        {enhanced ? (
          <Boundary onFailure={onFailure}>
            <Scene
              distance={distance}
              locale={locale}
              active={active}
              content={content}
              onReady={onReady}
              onFailure={onFailure}
              onFocusCard={jump}
            />
          </Boundary>
        ) : null}
        <div className={styles.intro} ref={intro}>
          <p>{en ? "Welcome to my desk" : "Çalışma masama hoş geldin"}</p>
          <h1>{content.name}</h1>
          <p>{content.intro}</p>
          <a href={content.cv}>{content.cvLabel}</a>
        </div>
        <nav
          className={styles.nav}
          aria-label={en ? "Journey sections" : "Yolculuk bölümleri"}
        >
          <a href="#journey-content">{en ? "Skip to work" : "İçeriğe geç"}</a>
          {content.labels.map((label, i) => (
            <a
              href={`#desk-story-${i}`}
              key={label}
              aria-current={chapter === i ? "step" : undefined}
              onClick={(e) => {
                if (
                  enhanced &&
                  !e.metaKey &&
                  !e.ctrlKey &&
                  !e.shiftKey &&
                  !e.altKey
                ) {
                  e.preventDefault();
                  history.pushState(null, "", `#desk-story-${i}`);
                  jump(i);
                }
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        {enhanced ? (
          <div className={styles.foot}>
            <span role="status">
              {!ready
                ? en
                  ? "Preparing the desk…"
                  : "Masa hazırlanıyor…"
                : en
                  ? "Scroll to explore"
                  : "Keşfetmek için kaydır"}
            </span>
            <button
              onClick={() => {
                fallbackTarget.current = Math.max(
                  0,
                  journeyAt(distance.get()).to - 1,
                );
                setStaticMode(true);
                setEnabled(false);
              }}
            >
              {en ? "Static view" : "Sabit görünüm"}
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.stories} data-fallback={!enhanced}>
        {failed ? (
          <p role="status">
            {en
              ? "3D is unavailable. Continue with the same content below."
              : "3D kullanılamıyor. Aynı içeriği aşağıda inceleyebilirsin."}
          </p>
        ) : null}
        {content.screens.map((cards, i) => (
          <section id={`desk-story-${i}`} key={i} tabIndex={-1}>
            <h2>{content.labels[i]}</h2>
            <Image
              src={`/images/desk/${["portrait", "ultrawide", "macbook"][i]}.webp?v=${assets.revision}`}
              alt={content.labels[i]}
              width={1280}
              height={960}
              sizes="(max-width:700px) 90vw, 640px"
            />
            {cards.map((card) => (
              <article key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <a href={card.href}>{card.action}</a>
              </article>
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}
