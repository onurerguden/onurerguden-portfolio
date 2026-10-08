import { closeupSize, screens } from "@/lib/desk-story/camera";
import { clamp, type StoryState } from "@/lib/desk-story/timeline";
import { shadeOf } from "./screen-panels";
import type { ScreenLayout, StoryMeasure } from "./use-story-layout";

const portraitIndex = 0;
const macbookIndex = 2;

const trackOf = (panel: HTMLElement) =>
  panel.firstElementChild!.firstElementChild as HTMLElement;

/**
 * Writes everything on the screens that follows scroll alone: content
 * offsets, row reveals, the Bliss parallax, the Explorer's rise and the
 * takeover of a screen too small to read on the desk. The camera and the
 * projection belong to the scene's Driver; these do not need a frame.
 */
export function paintScreens(
  measure: StoryMeasure,
  story: StoryState,
  panels: readonly (HTMLDivElement | null)[],
) {
  const monitor = panels[portraitIndex];
  if (monitor) {
    const { overflow, window } = measure.screens.portrait;
    const offset = story.reading[portraitIndex] * overflow;
    trackOf(monitor).style.transform = `translateY(${-offset}px)`;
    monitor.dataset.offset = offset.toFixed(1);
    // Rows light up as the monitor's window reaches them: the window opens
    // while the camera arrives, then slides with the content.
    const windowBottom = offset + window * story.arrival[portraitIndex];
    for (const row of measure.portrait.rows) {
      const value = clamp(
        (windowBottom - row.top) / Math.max(1, row.height * 0.75),
      );
      if (row.value !== undefined && Math.abs(row.value - value) < 0.002)
        continue;
      row.value = value;
      row.node.style.setProperty("--reveal", value.toFixed(3));
    }
  }
  const laptop = panels[macbookIndex];
  const desktop = laptop?.querySelector<HTMLElement>("[data-xp]");
  if (laptop && desktop) {
    // Bliss parts as the camera arrives (-1 to 0) and leaves (0 to 1).
    const parallax =
      story.arrival[macbookIndex] - 1 + story.departure[macbookIndex];
    // Each value goes on the element that uses it; on the desktop it would
    // restyle everything inside it, the Explorer's list included, every frame.
    const shift = parallax.toFixed(4);
    for (const layer of desktop.querySelectorAll<HTMLElement>(
      "[data-bliss-layer]",
    ))
      layer.style.setProperty("--s", shift);
    desktop
      .querySelector<HTMLElement>("[data-explorer]")
      ?.style.setProperty("--rise", story.rise[macbookIndex].toFixed(4));
    const offset =
      story.reading[macbookIndex] * measure.screens.macbook.overflow;
    const list = desktop.querySelector<HTMLElement>("[data-explorer-list]");
    if (list) list.style.transform = `translateY(${-offset}px)`;
    laptop.dataset.offset = offset.toFixed(1);
  }
  takeOver(
    monitor,
    portraitIndex,
    measure.screens.portrait,
    story.dive[portraitIndex],
  );
  takeOver(
    laptop,
    macbookIndex,
    measure.screens.macbook,
    story.dive[macbookIndex],
  );
}

/**
 * Grows a screen from its place on the desk to the whole view. At 0 the
 * Driver projects it; above 0 it is flat, scaled from the screen's box on
 * the desk to the view while its crop opens to the full panel. A dive only
 * happens with the camera on the screen's close-up, facing it square on,
 * so that box is the close-up's centred rectangle.
 */
function takeOver(
  panel: HTMLDivElement | null,
  index: number,
  layout: ScreenLayout,
  dive: number,
) {
  if (!panel || !layout.dive) return;
  panel.dataset.diving = String(dive > 0);
  panel.dataset.takeover = String(dive >= 1);
  if (dive <= 0) return;
  const aspect = screens[index].width / screens[index].height;
  const crop = Math.min(layout.width, layout.height * aspect);
  const cropHeight = crop / aspect;
  const left = (layout.width - crop) / 2;
  const size = closeupSize(index, layout.width, layout.height);
  const box = {
    x: (layout.width - size.width) / 2,
    y: (layout.height - size.height) / 2,
    width: size.width,
  };
  const start = box.width / crop;
  const scale = start + (1 - start) * dive;
  const x = (box.x - left * start) * (1 - dive);
  const y = box.y * (1 - dive);
  panel.style.visibility = "visible";
  panel.style.opacity = "";
  shadeOf(panel).style.opacity = "0";
  // The Driver does not touch a panel that is taking over.
  panel.style.pointerEvents = dive >= 1 ? "auto" : "none";
  panel.style.transform = `matrix(${scale}, 0, 0, ${scale}, ${x}, ${y})`;
  const side = left * (1 - dive);
  const bottom = (layout.height - cropHeight) * (1 - dive);
  panel.style.clipPath = `inset(0 ${side}px ${bottom}px ${side}px)`;
}
