"use client";
import dynamic from "next/dynamic";
import { preload } from "react-dom";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";
import {
  arrivalDistance,
  clamp,
  ease,
  exitRange,
  holds,
  readDistance,
  readRange,
  remapDistance,
  riseRange,
  roomDistance,
  storyAt,
  type StoryState,
  type Timeline,
} from "@/lib/desk-story/timeline";
import type { JourneyContent } from "@/lib/desk-story/content";
import {
  deskDecoderPath,
  deskModelSrc,
  roomPoster,
} from "@/lib/desk-asset-urls";
import { stageRegistry } from "@/lib/stage-registry";
import { homeSections, type SectionLink } from "@/lib/home-sections";
import { currentSection } from "@/lib/current-section";
import { deskMode, useStaticDesk } from "@/lib/desk-mode";
import { curtainProgress } from "@/lib/desk-story/curtain";
import { laptopPhase, type LaptopPhase } from "@/lib/desk-story/store";
import { quality } from "@/lib/quality";
import { signal } from "@/lib/desk-story/signal";
import { onScrollFrame } from "@/lib/scroll-frame";
import SceneBoundary from "@/components/three/scene-boundary";
import { JourneyNav, plainClick } from "@/components/site/site-nav";
import monitorStyles from "@/components/sections/monitor.module.css";
import xpStyles from "@/components/xp/xp.module.css";
import styles from "./journey.module.css";
import hintStyles from "./scroll-hint.module.css";
import PortraitIdentity from "./portrait-identity";
import { staticQuery } from "@/lib/motion-preference";
import ScreenPanels from "./screen-panels";
import { paintScreens } from "./paint-screens";
import {
  localTop,
  useStoryLayout,
  type StoryMeasure,
} from "./use-story-layout";
const Scene = dynamic(() => import("./journey-scene"), { ssr: false });

/** Server-rendered sections shown on the desk's screens. */
export type ScreenContent = {
  services: ReactNode;
  experience: ReactNode;
  stack: ReactNode;
};

/** Sections on the desk's screens, in story order. */
const chapterIds = ["services", "experience", "stack"] as const;

function chapterDistances(measure: StoryMeasure) {
  const { timeline, portrait } = measure;
  const { overflow, scale } = measure.screens.portrait;
  // Experience starts with its title just under the monitor's top edge.
  const experience = overflow
    ? (portrait.experienceTop - 24 / scale) / overflow
    : 0;
  return [
    arrivalDistance(timeline, 0),
    readDistance(timeline, 0, experience),
    arrivalDistance(timeline, 2),
  ];
}

/** The chapter on screen at `distance`, or -1 between screens. */
function chapterAt(measure: StoryMeasure, story: StoryState): number {
  if (story.active === 0) {
    const { overflow, window } = measure.screens.portrait;
    const { experienceTop } = measure.portrait;
    return story.reading[0] * overflow + window / 2 >= experienceTop ? 1 : 0;
  }
  return story.active === 2 ? 2 : -1;
}

/** Where the MacBook's balls are in their story; see LaptopPhase. */
function phaseAt(measure: StoryMeasure, story: StoryState): LaptopPhase {
  const [start, end] = readRange(measure.timeline, 0);
  if (story.distance < (start + end) / 2) return "away";
  if (story.arrival[2] < 1) return "near";
  if (story.rise[2] <= 0) return "desk";
  return story.rise[2] < 1 ? "rise" : "gone";
}

/**
 * Draws the paper curtain: the stage clipped by `side`% from each side, the
 * desk scaled back and dimmed by `exit`, and the paper edges placed on the
 * clip. Inline styles on a handful of elements, never a custom property
 * on an ancestor, so a scroll frame restyles only them. The edges move by
 * transform (`width` is the stage's), so placing them never lays out.
 */
function paintCurtain(
  stage: HTMLElement | null,
  scene: HTMLElement | null,
  edges: (HTMLElement | null)[],
  dim: HTMLElement | null,
  side: number,
  exit: number,
  width = 0,
) {
  if (!stage) return;
  stage.style.clipPath = side > 0 ? `inset(0 ${side}% 0 ${side}%)` : "";
  if (dim) dim.style.opacity = String(0.55 * exit);
  if (scene)
    scene.style.transform = exit > 0 ? `scale(${1 - 0.06 * exit})` : "";
  const offset = (side / 100) * width;
  edges.forEach((edge, i) => {
    if (!edge) return;
    edge.style.display = side > 0 ? "block" : "";
    edge.style.transform =
      side > 0 ? `translateX(${i ? -offset : offset}px)` : "";
  });
}

/** `top` as the page can scroll to it. */
function withinPage(top: number) {
  const root = document.documentElement;
  return Math.min(Math.max(0, top), root.scrollHeight - root.clientHeight);
}

/**
 * Lands on `target` unless it is already there. A scroll of under half a
 * pixel moves nothing but still cancels a smooth wheel or keyboard scroll
 * under way, so corrections that come to nothing are skipped. Where a link
 * lands: under the page's scroll padding, after the target's scroll margin.
 */
function landOn(target: HTMLElement) {
  const rest =
    (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
      0) + (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
  const top = withinPage(
    window.scrollY + target.getBoundingClientRect().top - rest,
  );
  if (Math.abs(top - window.scrollY) < 0.5) return;
  target.scrollIntoView({ behavior: "instant", block: "start" });
}

/** Scrolls the page to `top` unless it is there already (see landOn). */
function scrollToTop(top: number) {
  if (Math.abs(withinPage(top) - window.scrollY) < 0.5) return;
  window.scrollTo({ top, behavior: "instant" });
}

/** The opening fades on a scroll timeline where the browser has them. */
let timelines: boolean | undefined;
const scrollTimelines = () =>
  (timelines ??=
    typeof CSS !== "undefined" && CSS.supports("animation-timeline", "view()"));

export default function DeskJourney({
  locale,
  content,
  screens,
  sections = [],
}: {
  locale: "en" | "tr";
  content: JourneyContent;
  screens: ScreenContent;
  /** Home sections, listed in the nav's Sections menu. */
  sections?: SectionLink[];
}) {
  const en = locale === "en";
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  // The paper curtain's two edges (left, right).
  const edges = useRef<(HTMLSpanElement | null)[]>([]);
  const dim = useRef<HTMLSpanElement>(null);
  const nav = useRef<HTMLElement>(null);
  const hideNavOnScroll = useRef(false);
  // The static section to land on when the desk gives way to the page.
  const fallbackTarget = useRef<string | null>(null);
  // Bumped to end a focus reveal's hold on its position.
  const revealHold = useRef(0);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [failed, setFailed] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  const [chapter, setChapter] = useState(-1);
  const [around, setAround] = useState<[number, number]>([-1, 0]);
  const [finalView, setFinalView] = useState(false);
  // A screen fills the view, so the desk behind it can stop drawing.
  const [covered, setCovered] = useState(false);
  const [diving, setDiving] = useState(false);
  const [nearStage, setNearStage] = useState(true);
  // The section a hash link is heading for, until the visitor scrolls.
  const pendingHash = useRef<{ id: string; top: number } | null>(null);
  const [sceneShown, setSceneShown] = useState(false);
  const chapterRef = useRef(-1);
  const aroundRef = useRef<[number, number]>([-1, 0]);
  const finalViewRef = useRef(false);
  const coverRef = useRef({ covered: false, diving: false });
  const [distance] = useState(() => signal(0));
  // The visitor's own "turn 3D off", kept for this visit.
  const chosenStatic = useStaticDesk();
  const still = staticMode || failed || chosenStatic;
  const enhanced = enabled && !still;
  if (enhanced) {
    // Fetch the model and its decoder alongside the scene's code instead of
    // one after the other; the loaders then read them from the cache.
    const fetched = { as: "fetch", crossOrigin: "anonymous" } as const;
    preload(deskModelSrc, fetched);
    preload(`${deskDecoderPath}draco_wasm_wrapper.js`, fetched);
    preload(`${deskDecoderPath}draco_decoder.wasm`, fetched);
  }
  const { layout, measured } = useStoryLayout(enhanced, stage, panels);
  const targets = useMemo(() => chapterDistances(measured), [measured]);
  // The story at its distance: every DOM write a scroll makes, after the one
  // layout read in `read` below (see scroll-frame).
  const write = useCallback(() => {
    const node = section.current;
    if (!node) return;
    const measure = layout.current;
    const d = distance.get();
    // For QA: the desk stops drawing behind a takeover, so the scene's own
    // counters can lag; the story's distance never does.
    node.dataset.distance = d.toFixed(3);
    // Complete the poster handoff while the opening camera is still
    // stationary. Where the browser has scroll timelines the poster fades on
    // the compositor instead (portrait.module.css), the same curve, and
    // never waits on this thread.
    if (!scrollTimelines()) {
      const openingProgress = Math.min(1, d / 0.15);
      const openingOpacity =
        1 - openingProgress * openingProgress * (3 - 2 * openingProgress);
      // On the poster itself: on the section, every change would restyle
      // the whole desk, screens and all.
      stage.current
        ?.querySelector<HTMLElement>("[data-opening-poster]")
        ?.style.setProperty("--opening-opacity", String(openingOpacity));
    }
    node.dataset.travelled = String(d > 0.15);
    // Over the desk the bar gets out of the way; below it, the scroll
    // direction decides (see the docking listener).
    if (
      nav.current &&
      hideNavOnScroll.current &&
      nav.current.dataset.docked !== "true"
    ) {
      nav.current.dataset.hidden = String(d > 0.15);
      if (d > 0.15) nav.current.dataset.revealed = "false";
    }
    const state = storyAt(measure.timeline, d);
    paintScreens(measure, state, panels.current);
    laptopPhase.set(phaseAt(measure, state));
    // The MacBook's Bliss layers download once the visitor moves (or the
    // desk is ready), not with the page; the opening covers them until then.
    if (d > 0.02) node.dataset.bliss = "load";
    const dive = Math.max(...state.dive);
    // The paper curtain: during the final hold the desk's sides draw back a
    // little to show the page beneath, then the exit clips it from both
    // sides to nothing while it recedes and dims. The camera does not move,
    // so the desk draws no frames meanwhile.
    const exit = exitRange(measure.timeline);
    const side = exit
      ? 4 * ease((d - roomDistance(measure.timeline)) / holds.room) +
        46 * state.exit
      : 0;
    paintCurtain(
      stage.current,
      wrapper.current,
      edges.current,
      dim.current,
      side,
      state.exit,
      side > 0 ? measure.stage.width || (stage.current?.offsetWidth ?? 0) : 0,
    );
    curtainProgress.set(exit ? state.exit : 1);
    const nextCover = {
      covered: dive >= 1 || state.exit >= 1,
      diving: dive > 0,
    };
    if (
      nextCover.covered !== coverRef.current.covered ||
      nextCover.diving !== coverRef.current.diving
    ) {
      coverRef.current = nextCover;
      setCovered(nextCover.covered);
      setDiving(nextCover.diving);
    }
    const nextFinalView = state.segment === "hold" && state.from === "room";
    if (finalViewRef.current !== nextFinalView) {
      finalViewRef.current = nextFinalView;
      setFinalView(nextFinalView);
    }
    const nextChapter = chapterAt(measure, state);
    if (chapterRef.current !== nextChapter) {
      chapterRef.current = nextChapter;
      setChapter(nextChapter);
    }
    if (d < measure.timeline.length)
      currentSection.set(
        state.exit >= 0.5
          ? "about"
          : nextChapter >= 0
            ? chapterIds[nextChapter]
            : null,
      );
    // The chapters before and after this point, for the step buttons.
    const distances = chapterDistances(measure);
    const previous = distances.findLastIndex((t) => t < d - 0.02);
    const next = distances.findIndex((t) => t > d + 0.02);
    if (aroundRef.current[0] !== previous || aroundRef.current[1] !== next) {
      aroundRef.current = [previous, next];
      setAround([previous, next]);
    }
  }, [distance, layout]);
  const read = useCallback(() => {
    const node = section.current;
    if (node?.dataset.enhanced !== "true") return;
    const measure = layout.current;
    const height = measure.stage.height || node.offsetHeight;
    const d = clamp(
      -node.getBoundingClientRect().top / height,
      0,
      measure.timeline.length,
    );
    return () => {
      distance.set(d);
      write();
    };
  }, [distance, layout, write]);
  const update = useCallback(() => read()?.(), [read]);
  useEffect(() => {
    // Scroll events arrive at most once per frame, so the story follows the
    // page without its own animation loop.
    const off = onScrollFrame(read);
    window.addEventListener("resize", update);
    return () => {
      off();
      window.removeEventListener("resize", update);
    };
  }, [read, update]);
  useEffect(() => {
    const motion = matchMedia(staticQuery);
    // A computer without GPU acceleration reads the plain flow too.
    const plain = () => motion.matches || quality() === "static";
    const refresh = () => {
      setStaticMode(plain());
      setEnabled(!plain());
    };
    refresh();
    motion.addEventListener("change", refresh);
    const observer = new IntersectionObserver(([entry]) => {
      setActive(entry.isIntersecting);
      if (entry.isIntersecting && !plain()) setEnabled(true);
    });
    if (stage.current) observer.observe(stage.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", refresh);
    };
  }, []);
  useEffect(() => {
    // After the journey the nav docks to the top on every pointer type and
    // hides while scrolling down, returning when scrolling up. The section in
    // view is reported so a language switch lands on it.
    const flow = homeSections.filter((s) => s.place === "flow");
    // Which flow sections' tops have passed 40% of the view, kept by an
    // observer rather than measured on every scroll.
    const passed = new Map<string, boolean>();
    let docked = false;
    const reading = () => flow.findLast(({ id }) => passed.get(id))?.id ?? null;
    const sections = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          passed.set(
            entry.target.id,
            entry.isIntersecting ||
              entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0),
          );
        if (docked) currentSection.set(reading());
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    const observed = new Set<string>();
    // Any section not in the page yet is picked up once it is.
    const observe = () => {
      for (const { id } of flow) {
        const target = observed.has(id) ? null : document.getElementById(id);
        if (!target) continue;
        observed.add(id);
        sections.observe(target);
      }
    };
    observe();
    let lastY = window.scrollY;
    const read = () => {
      const node = nav.current;
      const content = document.getElementById("journey-content");
      if (!node || !content) return;
      const top = content.getBoundingClientRect().top;
      const y = window.scrollY;
      return () => {
        // With the curtain, About is already in place once the journey has
        // one view left to scroll; without it, once the journey has gone.
        const curtained = section.current?.dataset.journeyCurtain === "on";
        docked = top < (curtained ? innerHeight + 1 : 0);
        node.dataset.docked = String(docked);
        if (Math.abs(y - lastY) > 8) {
          const down = docked && y > lastY;
          node.dataset.scrollHidden = String(down);
          if (docked && hideNavOnScroll.current)
            node.dataset.hidden = String(
              down && node.dataset.revealed !== "true",
            );
          lastY = y;
        }
        if (!docked) return;
        if (observed.size < flow.length) observe();
        // The last section whose top has passed 40% of the view.
        currentSection.set(reading());
      };
    };
    read()?.();
    const off = onScrollFrame(read);
    return () => {
      off();
      sections.disconnect();
    };
  }, []);
  useEffect(() => {
    // Remember the section a link or the first load is heading for, so a
    // journey that grows mid-scroll can put the visitor back on it. Only the
    // visitor's own scrolling lets it go.
    const remember = () => {
      const hash = location.hash;
      const id = decodeURIComponent(hash.slice(1));
      const target =
        hash && hash !== "#journey-content"
          ? document.getElementById(id)
          : null;
      // Where the target sat when the link was used; only a layout change
      // that moves it justifies scrolling again.
      pendingHash.current = target
        ? { id, top: target.getBoundingClientRect().top + window.scrollY }
        : null;
    };
    const clear = (event: Event) => {
      pendingHash.current = null;
      // Tab moves focus, which is what starts a reveal; anything else is
      // the visitor taking over.
      if (!(event instanceof KeyboardEvent && event.key === "Tab"))
        revealHold.current++;
    };
    let settleBy = performance.now() + 10_000;
    const hashChanged = () => {
      remember();
      settleBy = performance.now() + 10_000;
    };
    remember();
    const events = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
    for (const event of events)
      window.addEventListener(event, clear, { passive: true });
    window.addEventListener("hashchange", hashChanged);
    // Sections that stream in later (the GitHub activity) resize the page
    // after the journey has settled; for the first seconds after a link,
    // keep its target in place for those too.
    const main = document.getElementById("main");
    const resized = new ResizeObserver(() => {
      const pending = pendingHash.current;
      const target = pending && document.getElementById(pending.id);
      if (!pending || !target || performance.now() > settleBy) return;
      const top = target.getBoundingClientRect().top + window.scrollY;
      if (Math.abs(top - pending.top) < 2) return;
      pending.top = top;
      // Scroll anchoring may already have kept it in place.
      landOn(target);
    });
    if (main) resized.observe(main);
    return () => {
      for (const event of events) window.removeEventListener(event, clear);
      window.removeEventListener("hashchange", hashChanged);
      resized.disconnect();
    };
  }, []);
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
        (node.dataset.docked === "true"
          ? node.dataset.scrollHidden === "true"
          : section.current?.dataset.travelled === "true") && !revealed,
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
    // A visitor who scrolled on while the desk prepared is already past the
    // opening: fade it out instead of cutting to the desk.
    const node = section.current;
    if (node && distance.get() > 0.15) {
      node.dataset.arrivedLate = "true";
      window.setTimeout(() => delete node.dataset.arrivedLate, 600);
    }
    setReady(true);
    setSceneShown(true);
  }, [distance]);
  const remember = useCallback(() => {
    const measure = layout.current;
    const d = distance.get();
    const index = chapterAt(measure, storyAt(measure.timeline, d));
    // From the final view on, the page continues with About.
    fallbackTarget.current =
      d >= roomDistance(measure.timeline)
        ? "about"
        : index >= 0
          ? chapterIds[index]
          : null;
  }, [layout, distance]);
  const onFailure = useCallback(() => {
    remember();
    setFailed(true);
    setReady(false);
  }, [remember]);
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
  // A re-measured story keeps the reader on the line they were reading.
  const laidOut = useRef<Timeline>(measured.timeline);
  useLayoutEffect(() => {
    const previous = laidOut.current;
    laidOut.current = measured.timeline;
    const node = section.current;
    if (!enhanced || !node || previous === measured.timeline) return;
    const height = measured.stage.height;
    const d = -node.getBoundingClientRect().top / height;
    // Often the line stays where it was; scrolling by nothing would still
    // stop a smooth scroll under way (see landOn).
    if (!pendingHash.current && d > 0 && d < previous.length)
      scrollToTop(
        window.scrollY +
          (remapDistance(previous, measured.timeline, d) - d) * height,
      );
    update();
  }, [enhanced, measured, update]);
  // The journey grows to its pinned height after hydration and again once it
  // is measured; keep a deep link (e.g. /en#experience) on its target unless
  // the visitor has scrolled since.
  useLayoutEffect(() => {
    const pending = pendingHash.current;
    const target = pending && document.getElementById(pending.id);
    if (!pending || !target) return;
    const top = target.getBoundingClientRect().top + window.scrollY;
    // Nothing moved: let a smooth scroll that is under way finish itself.
    if (Math.abs(top - pending.top) < 2) return;
    pending.top = top;
    landOn(target);
    // A smooth scroll already in flight can carry past the jump; hold the
    // target for a few frames unless the visitor scrolls themselves.
    // Where the target rests: the page's scroll padding plus its own scroll
    // margin (negative on the section sheets, which land at the very top).
    const padding =
      (parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      ) || 0) + (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    let frames = 0;
    let frame = requestAnimationFrame(function hold() {
      if (pendingHash.current !== pending || ++frames > 40) return;
      if (Math.abs(target.getBoundingClientRect().top - padding) > 4)
        landOn(target);
      frame = requestAnimationFrame(hold);
    });
    return () => cancelAnimationFrame(frame);
  }, [enhanced, ready, measured]);
  useEffect(() => {
    if (enhanced && ready) update();
  }, [enhanced, ready, update]);
  // Turning 3D off (here or in the nav) lands on the chapter being read.
  useEffect(() => {
    if (chosenStatic) remember();
  }, [chosenStatic, remember]);
  useEffect(() => {
    if (!enhanced) {
      if (fallbackTarget.current) {
        const target = document.getElementById(fallbackTarget.current);
        if (target) landOn(target);
        target?.focus({ preventScroll: true });
        fallbackTarget.current = null;
      }
    }
    if (!enhanced) {
      currentSection.set(null);
      laptopPhase.set("away");
      curtainProgress.set(1);
      paintCurtain(
        stage.current,
        wrapper.current,
        edges.current,
        dim.current,
        0,
        0,
      );
    }
  }, [enhanced]);
  useEffect(() => {
    if (!enhanced || ready || released) return;
    // A first visit compiles every shader before the desk shows; on a slow
    // GPU that alone can take several seconds, without blocking the page.
    const timeout = window.setTimeout(onFailure, 20000);
    return () => window.clearTimeout(timeout);
  }, [enhanced, ready, released, onFailure]);
  const jumpTo = useCallback(
    (d: number) => {
      const node = section.current;
      if (!enhanced || !node) return;
      scrollToTop(
        node.getBoundingClientRect().top +
          window.scrollY +
          d * layout.current.stage.height,
      );
      update();
    },
    [enhanced, layout, update],
  );
  // Focus on a screen moves the story to where the focused link is readable,
  // so keyboard and screen reader users never act on content out of view.
  const reveal = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      const panel = target.closest<HTMLElement>("[data-screen]");
      const track = panel?.querySelector<HTMLElement>("[data-track]");
      if (!panel || !track) return;
      const measure = layout.current;
      // The browser scrolls a focused element into view after this event,
      // to where the panel's untransformed box would be (smoothly, over
      // several frames); hold the story's position until it has done so.
      const settle = (d: number) => {
        jumpTo(d);
        const node = section.current;
        if (!node) return;
        const target = () =>
          node.getBoundingClientRect().top +
          window.scrollY +
          d * layout.current.stage.height;
        let frames = 0;
        const token = ++revealHold.current;
        requestAnimationFrame(function hold() {
          // Anything the visitor does next (or a step button) ends the hold.
          if (++frames > 20 || token !== revealHold.current) return;
          if (Math.abs(window.scrollY - target()) > 2) jumpTo(d);
          requestAnimationFrame(hold);
        });
      };
      const story = storyAt(measure.timeline, distance.get());
      const screen = Number(panel.dataset.screen);
      const { timeline } = measure;
      if (screen === 0) {
        // The focused element itself, not its row: a link can sit at the
        // foot of a row taller than the window.
        const row = target;
        const top = localTop(row, track);
        const { overflow, window } = measure.screens.portrait;
        const offset = story.reading[0] * overflow;
        if (
          story.active === 0 &&
          story.dive[0] >= (measure.screens.portrait.dive ? 1 : 0) &&
          top >= offset &&
          top + row.offsetHeight <= offset + window * 0.9
        )
          return;
        settle(
          readDistance(
            timeline,
            0,
            overflow ? (top - window * 0.3) / overflow : 0,
          ),
        );
      } else if (screen === 2) {
        const list = panel.querySelector<HTMLElement>("[data-explorer-list]");
        const entry = target.closest<HTMLElement>("li");
        if (list && entry && list.contains(entry)) {
          // A link in the list: open the Explorer and read to its row.
          const top = localTop(entry, list);
          const { overflow, window } = measure.screens.macbook;
          const offset = story.reading[2] * overflow;
          if (
            story.rise[2] >= 1 &&
            story.active === 2 &&
            top >= offset &&
            top + entry.offsetHeight <= offset + window * 0.9
          )
            return;
          settle(
            readDistance(
              timeline,
              2,
              overflow ? (top - window * 0.3) / overflow : 0,
            ),
          );
        } else if (story.active !== 2 || story.rise[2] > 0) {
          // The desktop's own controls: back to the XP desktop.
          const [rise] = riseRange(timeline, 2);
          settle(rise - 0.05);
        }
      }
    },
    [distance, jumpTo, layout],
  );
  const chapterLabels = homeSections
    .filter((s) => s.place !== "flow")
    .map((s) => s.label[locale]);
  const measuredReady = enhanced && measured.stage.height > 0;
  const story = measured.timeline;
  const screenSection = (id: (typeof chapterIds)[number], page: boolean) => (
    <section
      key={id}
      id={page ? id : undefined}
      tabIndex={page ? -1 : undefined}
      className={
        page
          ? `${id === "stack" ? xpStyles.page : monitorStyles.page} bleed`
          : id === "stack"
            ? xpStyles.screen
            : undefined
      }
      aria-labelledby={`${id}-title`}
    >
      {screens[id]}
    </section>
  );
  return (
    <>
      <section
        ref={section}
        className={styles.journey}
        data-enhanced={enhanced}
        data-ready={ready}
        data-static={still}
        data-journey-released={released}
        data-journey-curtain={enhanced && exitRange(story) ? "on" : "off"}
        data-story={
          measuredReady
            ? JSON.stringify({
                length: story.length,
                portrait: readRange(story, 0),
                macbook: readRange(story, 2),
                room: roomDistance(story),
                exit: exitRange(story),
                chapters: Object.fromEntries(
                  chapterIds.map((id, i) => [id, targets[i]]),
                ),
              })
            : undefined
        }
        style={
          {
            "--journey-height": `calc(${story.length + 1} * var(--stage-height))`,
          } as CSSProperties
        }
        aria-label={en ? "From my desk to my work" : "Masamdan çalışmalarıma"}
      >
        <div
          className={styles.stage}
          ref={stage}
          data-journey-stage
          onFocus={(event) => {
            // Focus in a desk being drawn aside brings the whole desk back.
            const measure = layout.current;
            if (
              storyAt(measure.timeline, distance.get()).exit > 0 &&
              event.target !== event.currentTarget
            )
              jumpTo(roomDistance(measure.timeline) + holds.room / 2);
          }}
        >
          <PortraitIdentity content={content} opening interactive={!still} />
          {posterVisible ? (
            <Image
              {...roomPoster(locale)}
              className={styles.releasedPoster}
              alt=""
              fill
              data-journey-poster
            />
          ) : null}
          {enhanced ? (
            <div
              className={styles.scene}
              ref={wrapper}
              style={{ opacity: sceneShown ? 1 : 0 }}
              data-diving={diving}
              data-covered={covered}
              onFocus={reveal}
            >
              <ScreenPanels
                panels={panels}
                content={content}
                interactive={!still}
                monitor={
                  <div className={monitorStyles.screen}>
                    {screenSection("services", false)}
                    {screenSection("experience", false)}
                  </div>
                }
                laptop={screenSection("stack", false)}
              />
              {!released ? (
                <SceneBoundary label="Desk scene" onFailure={onFailure}>
                  <Scene
                    distance={distance}
                    locale={locale}
                    active={active && !covered}
                    onReady={onReady}
                    onFailure={onFailure}
                    wrapper={wrapper}
                    panels={panels}
                    layout={layout}
                  />
                </SceneBoundary>
              ) : null}
            </div>
          ) : null}
          {enhanced
            ? (["left", "right"] as const).map((side, i) => (
                <span
                  key={side}
                  ref={(node) => {
                    edges.current[i] = node;
                  }}
                  className={styles.curtainEdge}
                  data-side={side}
                  aria-hidden="true"
                />
              ))
            : null}
          {enhanced && ready && finalView ? (
            // Remounted on every return to the final view, so its few
            // strokes play again and then stop (WCAG 2.2.2).
            <div
              className={styles.continueCue}
              data-continue-cue
              aria-hidden="true"
            >
              <span className={hintStyles.hint} />
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
              {ready ? (
                <div className={styles.steps}>
                  {around.map((index, i) =>
                    index >= 0 ? (
                      <button
                        key={i ? "next" : "previous"}
                        type="button"
                        data-step={i ? "next" : "previous"}
                        aria-label={`${
                          i
                            ? en
                              ? "Next"
                              : "Sonraki"
                            : en
                              ? "Previous"
                              : "Önceki"
                        }: ${chapterLabels[index]}`}
                        onClick={() => {
                          revealHold.current++;
                          jumpTo(targets[index]);
                        }}
                      >
                        <span aria-hidden="true">{i ? "↓" : "↑"}</span>
                      </button>
                    ) : null,
                  )}
                </div>
              ) : null}
              <button type="button" onClick={() => deskMode.set(true)}>
                {en ? "Turn 3D off" : "3D’yi kapat"}
              </button>
            </div>
          ) : null}
          {enhanced ? (
            <span ref={dim} className={styles.curtainDim} aria-hidden="true" />
          ) : null}
        </div>
        {measuredReady
          ? chapterIds.map((id, i) => (
              <span
                key={id}
                id={id}
                className={styles.storyAnchor}
                style={{
                  top:
                    targets[i] * measured.stage.height + measured.scrollPadding,
                }}
              />
            ))
          : null}
      </section>
      <JourneyNav
        locale={locale}
        navRef={nav}
        chapters={chapterIds.map((id, i) => ({
          id,
          href: `#${id}`,
          label: chapterLabels[i],
        }))}
        current={chapter}
        sections={sections}
        onSkip={(event) => {
          if (!plainClick(event)) return;
          event.preventDefault();
          history.pushState(null, "", "#about");
          const target = document.getElementById("about");
          if (target) landOn(target);
          target?.focus({ preventScroll: true });
          // Treat it as a link: the journey keeps About in place if it is
          // still measuring and grows.
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }}
      />
      {/* Where the desk ends: the nav docks once this has scrolled past. */}
      <div id="journey-content" />
      {failed ? (
        <p className={styles.unavailable} role="status">
          {en
            ? "3D is unavailable. Continue with the same content below."
            : "3D kullanılamıyor. Aynı içeriği aşağıda inceleyebilirsin."}
        </p>
      ) : null}
      {!enhanced ? chapterIds.map((id) => screenSection(id, true)) : null}
    </>
  );
}
