"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
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
  componentDidCatch(error: Error) {
    console.error("Desk scene failed", error);
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function DeskJourney({
  locale,
  content,
  introduction,
}: {
  locale: "en" | "tr";
  content: JourneyContent;
  introduction?: ReactNode;
}) {
  const en = locale === "en";
  const otherLocale = en ? "tr" : "en";
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const hideNavOnScroll = useRef(false);
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
      if (section.current) section.current.dataset.travelled = String(d > 0.15);
      if (nav.current && hideNavOnScroll.current) {
        nav.current.dataset.hidden = String(d > 0.15);
        if (d > 0.15) nav.current.dataset.revealed = "false";
      }
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
      setEnabled(!motion.matches);
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
  useEffect(() => {
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const syncPointerMode = () => {
      hideNavOnScroll.current = finePointer.matches;
      if (!finePointer.matches && nav.current) {
        nav.current.dataset.hidden = "false";
        nav.current.dataset.revealed = "false";
      }
    };
    const revealAtTop = (event: PointerEvent) => {
      const node = nav.current;
      if (!node || !hideNavOnScroll.current) return;
      const rect = node.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
      );
      node.style.setProperty("--nav-pointer-x", `${x}%`);
      const revealed = event.clientY <= 116;
      node.dataset.revealed = String(revealed);
      node.dataset.hidden = String(
        section.current?.dataset.travelled === "true" && !revealed,
      );
    };
    syncPointerMode();
    finePointer.addEventListener("change", syncPointerMode);
    window.addEventListener("pointermove", revealAtTop, { passive: true });
    return () => {
      finePointer.removeEventListener("change", syncPointerMode);
      window.removeEventListener("pointermove", revealAtTop);
    };
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => {
    fallbackTarget.current = Math.max(0, journeyAt(distance.get()).active);
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
      if (!enhanced || screen === 1) return;
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
    <>
      <section
        ref={section}
        className={styles.journey}
        data-enhanced={enhanced}
        data-ready={ready}
        data-static={staticMode || failed}
        aria-label={en ? "From my desk to my work" : "Masamdan çalışmalarıma"}
      >
        <div className={styles.stage} ref={stage} data-journey-stage>
          <noscript>
            <Image
              src="/images/desk/room-poster.webp"
              alt={
                en
                  ? "My desk in a sunlit room"
                  : "Gün ışığı alan odada çalışma masam"
              }
              fill
              sizes="100vw"
              className={styles.poster}
            />
          </noscript>
          {staticMode || failed ? (
            <Image
              src="/images/desk/room-poster.webp"
              alt={
                en
                  ? "My desk in a sunlit room with a marble floor"
                  : "Mermer zeminli, gün ışığı alan odada çalışma masam"
              }
              fill
              sizes="100vw"
              className={styles.poster}
            />
          ) : null}
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
          <div className={styles.scrollCue} ref={intro}>
            <span>{en ? "Scroll down" : "Aşağı kaydır"}</span>
            <span className={styles.scrollLine} aria-hidden="true" />
          </div>
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
                    journeyAt(distance.get()).active,
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
      </section>
      <nav
        ref={nav}
        className={styles.nav}
        data-hidden="false"
        data-revealed="false"
        aria-label={en ? "Journey sections" : "Yolculuk bölümleri"}
      >
        <a
          className={styles.journeySkip}
          href="#journey-content"
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            history.pushState(null, "", "#journey-content");
            const target = document.getElementById("journey-content");
            target?.scrollIntoView({ behavior: "instant", block: "start" });
            target?.focus({ preventScroll: true });
          }}
        >
          {en ? "Skip to work" : "İçeriğe geç"}
        </a>
        <Link className={styles.brand} href={`/${locale}`}>
          <span aria-hidden="true" />
          Onur Ergüden
        </Link>
        <div className={styles.sections}>
          {content.labels.map((label, i) => (
            <a
              href={`#desk-story-${i}`}
              key={label}
              aria-current={chapter === i ? "location" : undefined}
              onClick={(e) => {
                if (
                  enhanced &&
                  i !== 1 &&
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
        </div>
        <Link
          className={styles.language}
          href={`/${otherLocale}`}
          hrefLang={otherLocale}
          lang={otherLocale}
          aria-label={
            otherLocale === "tr" ? "Türkçeye geç" : "Switch to English"
          }
        >
          {otherLocale.toUpperCase()}
        </Link>
      </nav>
      <div id="journey-content" tabIndex={-1}>
        {introduction}
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
          <section
            id={`desk-story-${i}`}
            key={i}
            tabIndex={-1}
            data-research={i === 1}
          >
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
    </>
  );
}
