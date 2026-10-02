import contract from "../desk-scene.json";

export type CameraStop =
  "opening" | "desktop" | "portrait" | "macbook" | "room";

export const screenIds = [
  "PortraitScreen",
  "UltrawideScreen",
  "MacBookScreen",
] as const;
export type ScreenId = (typeof screenIds)[number];
export const screens = screenIds.map((id) => contract.screens[id]);
/** CSS width of each projected panel; its height follows the screen's aspect. */
export const screenPixelWidths = [1000, 2000, 1280] as const;
export const screenStops: readonly CameraStop[] = [
  "portrait",
  "opening",
  "macbook",
];
export const panelHeight = (screen: number) =>
  (screenPixelWidths[screen] * screens[screen].height) / screens[screen].width;

/** How much wider and taller than a screen its close-up frames. */
export const closeupMargin = { width: 1.16, height: 1.3 };

/**
 * CSS px per panel px while the camera rests on a screen's close-up. The
 * camera faces the screen along its normal, so the scale follows from the
 * framing alone: the screen fills 1/1.16 of the width or 1/1.3 of the height.
 */
export function closeupScale(screen: number, width: number, height: number) {
  const s = screens[screen];
  const pxPerUnit = Math.min(
    width / (closeupMargin.width * s.width),
    height / (closeupMargin.height * s.height),
  );
  return (s.width * pxPerUnit) / screenPixelWidths[screen];
}

/** The CSS size of a screen while the camera rests on its close-up. */
export function closeupSize(screen: number, width: number, height: number) {
  const scale = closeupScale(screen, width, height);
  return {
    width: screenPixelWidths[screen] * scale,
    height: panelHeight(screen) * scale,
  };
}

/** Below these sizes a projected screen takes over the view instead. */
export const diveBelow = { height: 360, width: 260 };

/**
 * Whether a screen is too small to read on the desk at this viewport: a
 * phone's MacBook, or both screens on a landscape phone or at high zoom.
 */
export function divesAt(screen: number, width: number, height: number) {
  const size = closeupSize(screen, width, height);
  return size.height < diveBelow.height || size.width < diveBelow.width;
}
