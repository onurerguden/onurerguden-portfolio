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
  laptop,
  interactive,
}: {
  panels: PanelRefs;
  content: Pick<JourneyContent, "name" | "role">;
  /** What I do and Experience, rendered once on the portrait monitor. */
  monitor?: ReactNode;
  /** The XP desktop with my tech stack, on the MacBook. */
  laptop?: ReactNode;
  interactive: boolean;
}) {
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
        >
          <div className={styles.screenSurface}>
            <div className={styles.track} data-track>
              {id === "UltrawideScreen" ? (
                <PortraitIdentity content={content} interactive={interactive} />
              ) : null}
              {id === "PortraitScreen" ? monitor : null}
              {id === "MacBookScreen" ? laptop : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
