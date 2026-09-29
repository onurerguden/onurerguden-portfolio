"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
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
import { stageRegistry } from "@/lib/stage-registry";
import type { SectionLink } from "@/lib/home-sections";
import SceneBoundary from "@/components/three/scene-boundary";
import MotionToggle from "@/components/motion-toggle";
import styles from "./journey.module.css";
import PortraitIdentity from "./portrait-identity";
const Scene = dynamic(() => import("./journey-scene"), { ssr: false });
export default function DeskJourney({
  locale,
  content,
  introduction,
  sections = [],
}: {
  locale: "en" | "tr";
  content: JourneyContent;
  introduction?: ReactNode;
  /** Home sections after the journey, listed in the nav's Sections menu. */
  sections?: SectionLink[];
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
  const [finalView, setFinalView] = useState(false);
  const [nearStage, setNearStage] = useState(true);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const sectionsButton = useRef<HTMLButtonElement>(null);
  const sectionsMenu = useRef<HTMLDivElement>(null);
  // A deep link from the first load, until the visitor scrolls on their own.
  const pendingHash = useRef<string | null>(null);
  const [sceneShown, setSceneShown] = useState(false);
  const chapterRef = useRef(-1);
  const finalViewRef = useRef(false);
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
      // Complete the poster handoff while the opening camera is still stationary.
      const openingProgress = Math.min(1, d / 0.15);
      const openingOpacity =
        1 - openingProgress * openingProgress * (3 - 2 * openingProgress);
      section.current.style.setProperty(
        "--opening-opacity",
        String(openingOpacity),
      );
      if (section.current) section.current.dataset.travelled = String(d > 0.15);
      if (nav.current && hideNavOnScroll.current) {
        nav.current.dataset.hidden = String(d > 0.15);
        if (d > 0.15) nav.current.dataset.revealed = "false";
      }
      const state = journeyAt(d);
      const nextFinalView = state.from === "room" && state.to === "room";
      if (finalViewRef.current !== nextFinalView) {
        finalViewRef.current = nextFinalView;
        setFinalView(nextFinalView);
      }
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
    // After the journey the nav docks to the top on every pointer type; on
    // touch it hides while scrolling down and returns when scrolling up.
    let lastY = window.scrollY;
    const sync = () => {
      const node = nav.current;
      const content = document.getElementById("journey-content");
      if (!node || !content) return;
      const docked = content.getBoundingClientRect().top < 0;
      node.dataset.docked = String(docked);
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 8) {
        node.dataset.scrollHidden = String(docked && y > lastY);
        lastY = y;
      }
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);
  useEffect(() => {
    const hash = location.hash;
    if (hash && !/^#(desk-story-\d|journey-content)$/.test(hash))
      pendingHash.current = hash;
    const clear = () => {
      pendingHash.current = null;
    };
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    for (const event of events)
      window.addEventListener(event, clear, { once: true, passive: true });
    window.addEventListener("hashchange", clear);
    return () => {
      for (const event of events) window.removeEventListener(event, clear);
      window.removeEventListener("hashchange", clear);
    };
  }, []);
  useEffect(() => {
    if (!sectionsOpen) return;
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !sectionsMenu.current?.contains(event.target as Node)
      ) {
        setSectionsOpen(false);
        if (event instanceof KeyboardEvent) sectionsButton.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [sectionsOpen]);
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    let releaseTimer = 0;
    // Release the desk's WebGL context once it is well out of view, so the
    // section scenes below never stack a third context (see stage-registry).
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(releaseTimer);
        if (entry.isIntersecting) setNearStage(true);
        else releaseTimer = window.setTimeout(() => setNearStage(false), 1000);
      },
      { rootMargin: "150% 0px" },
    );
    observer.observe(node);
    return () => {
      window.clearTimeout(releaseTimer);
      observer.disconnect();
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
  const onReady = useCallback(() => {
    setReady(true);
    setSceneShown(true);
  }, []);
  const onFailure = useCallback(() => {
    fallbackTarget.current = Math.max(0, journeyAt(distance.get()).active);
    setFailed(true);
    setReady(false);
  }, [distance]);
  const enhanced = enabled && !staticMode && !failed;
  useEffect(() => {
    if (!enhanced) {
      stageRegistry.remove("journey");
      return;
    }
    stageRegistry.update("journey", {
      priority: 3,
      visible: active,
      wanted: nearStage,
    });
  }, [enhanced, active, nearStage]);
  useEffect(() => () => stageRegistry.remove("journey"), []);
  const live = useSyncExternalStore(
    stageRegistry.subscribe,
    () => stageRegistry.isLive("journey"),
    () => false,
  );
  const released = enhanced && !live;
  useEffect(() => {
    if (!live) return;
    return () => setSceneShown(false);
  }, [live]);
  // The final tabletop capture covers the stage until a remounted scene is ready.
  const posterVisible = enhanced && ready && !sceneShown;
  // The journey grows to its pinned height after hydration; keep a deep link
  // (e.g. /en#services) on its target unless the visitor has scrolled since.
  useLayoutEffect(() => {
    const hash = pendingHash.current;
    if (!hash) return;
    document
      .getElementById(decodeURIComponent(hash.slice(1)))
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [enhanced, ready]);
  useEffect(() => {
    if (enhanced && ready) update(scrollYProgress.get());
  }, [enhanced, ready, scrollYProgress, update]);
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
    if (!enhanced || ready || released) return;
    const timeout = window.setTimeout(onFailure, 12000);
    return () => window.clearTimeout(timeout);
  }, [enhanced, ready, released, onFailure]);
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
        data-journey-released={released}
        style={
          {
            "--journey-height": `${(journeyLength + 1) * 100}svh`,
          } as CSSProperties
        }
        aria-label={en ? "From my desk to my work" : "Masamdan çalışmalarıma"}
      >
        <div className={styles.stage} ref={stage} data-journey-stage>
          <PortraitIdentity
            content={content}
            opening
            interactive={!staticMode && !failed}
          />
          {posterVisible ? (
            <Image
              className={styles.releasedPoster}
              src={`/images/desk/room-poster.webp?v=${assets.revision}`}
              alt=""
              fill
              sizes="100vw"
              data-journey-poster
            />
          ) : null}
          {enhanced && !released ? (
            <SceneBoundary label="Desk scene" onFailure={onFailure}>
              <Scene
                distance={distance}
                locale={locale}
                active={active}
                content={content}
                onReady={onReady}
                onFailure={onFailure}
                onFocusCard={jump}
              />
            </SceneBoundary>
          ) : null}
          <div className={styles.scrollCue} ref={intro}>
            <span>{en ? "Scroll down" : "Aşağı kaydır"}</span>
            <span className={styles.scrollLine} aria-hidden="true" />
          </div>
          {enhanced && ready && finalView ? (
            <div
              className={styles.continueCue}
              data-continue-cue
              aria-hidden="true"
            >
              <span>
                {en ? "Scroll to continue" : "Devam etmek için kaydır"}
              </span>
              <span aria-hidden="true">↓</span>
            </div>
          ) : null}
          {enhanced ? (
            <div className={styles.foot}>
              <span role="status">
                {!ready
                  ? en
                    ? "Preparing the desk…"
                    : "Masa hazırlanıyor…"
                  : en
                    ? finalView
                      ? "Scroll to continue"
                      : "Scroll to explore"
                    : finalView
                      ? "Devam etmek için kaydır"
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
        {sections.length ? (
          <div className={styles.menu} ref={sectionsMenu}>
            <button
              type="button"
              ref={sectionsButton}
              className={styles.menuButton}
              aria-expanded={sectionsOpen}
              aria-controls="journey-sections-menu"
              onClick={() => setSectionsOpen((open) => !open)}
            >
              {en ? "Sections" : "Bölümler"}
              <span aria-hidden="true" />
            </button>
            <div
              id="journey-sections-menu"
              className={styles.menuPanel}
              hidden={!sectionsOpen}
            >
              <ul>
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={() => setSectionsOpen(false)}
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
              <MotionToggle locale={locale} className={styles.motionToggle} />
            </div>
          </div>
        ) : null}
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
