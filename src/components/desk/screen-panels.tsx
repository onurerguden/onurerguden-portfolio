"use client";
import type { ReactNode, RefObject } from "react";
import {
  panelHeight,
  screenIds,
  screenPixelWidths,
} from "@/lib/desk-story/camera";
import type { JourneyContent } from "@/lib/desk-story/content";
import styles from "./journey.module.css";
import PortraitIdentity from "./portrait-identity";

export type PanelRefs = RefObject<(HTMLDivElement | null)[]>;

/**
 * The HTML drawn onto the desk's three displays. The scene's Driver projects
 * each panel onto its screen with `matrix3d`; until it does, panels stay
 * hidden but laid out, so the story can be measured before the 3D loads.
 */
export default function ScreenPanels({
  panels,
  content,
  monitor,
  interactive,
  laptop = true,
}: {
  panels: PanelRefs;
  content: JourneyContent;
  /** What I do and Experience, rendered once on the portrait monitor. */
  monitor?: ReactNode;
  interactive: boolean;
  /** The MacBook's pages; the poster capture leaves them out. */
  laptop?: boolean;
}) {
  const cards = content.laptop.cards;
  return (
    <div className={styles.screenLayer}>
      {screenIds.map((id, i) => (
        <div
          key={id}
          ref={(node) => {
            panels.current[i] = node;
          }}
          className={styles.screen}
          data-screen={i}
          style={{ width: screenPixelWidths[i], height: panelHeight(i) }}
          // The ultrawide repeats the opening identity, which is the h1.
          aria-hidden={id === "UltrawideScreen" ? true : undefined}
          inert={id === "UltrawideScreen" ? true : undefined}
          role={id === "MacBookScreen" ? "group" : undefined}
          aria-label={id === "MacBookScreen" ? content.laptop.label : undefined}
        >
          <div className={styles.screenSurface}>
            <div className={styles.track} data-track>
              {id === "UltrawideScreen" ? (
                <PortraitIdentity content={content} interactive={interactive} />
              ) : null}
              {id === "PortraitScreen" ? monitor : null}
              {id === "MacBookScreen" && laptop
                ? cards.map((card, j) => (
                    <article
                      key={card.title}
                      style={{ height: panelHeight(i) }}
                      className={styles.card}
                    >
                      <span className={styles.label}>
                        {content.laptop.label}
                      </span>
                      <h2>{card.title}</h2>
                      <p>{card.body}</p>
                      <a href={card.href}>
                        {card.action}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                      <span className={styles.page}>
                        {String(j + 1).padStart(2, "0")} /{" "}
                        {String(cards.length).padStart(2, "0")}
                      </span>
                    </article>
                  ))
                : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
