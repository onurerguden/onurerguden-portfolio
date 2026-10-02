import { Vector3 } from "three";
import contract from "../desk-scene.json";

export type CameraStop =
  "opening" | "desktop" | "portrait" | "macbook" | "room";
export type CameraAnchor = { target: Vector3; position: Vector3; fov: number };

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

const fov = 43;
const tangent = Math.tan((fov * Math.PI) / 360);
/** How much wider and taller than a screen its close-up frames. */
const closeupMargin = { width: 1.16, height: 1.3 };

/**
 * Camera positions for every stop, for a canvas of `width` × `height` CSS px.
 * Pure, so the journey can be laid out before the 3D scene has loaded.
 */
export function cameraAnchors(
  width: number,
  height: number,
): Record<CameraStop, CameraAnchor> {
  const aspect = width / height;
  const mobile = width < 700;
  const closeup = (s: (typeof screens)[number]) => {
    const target = new Vector3(...s.position);
    const distance =
      Math.max(
        (s.width * closeupMargin.width) / aspect,
        s.height * closeupMargin.height,
      ) /
      (2 * tangent);
    return {
      target,
      fov,
      position: target
        .clone()
        .addScaledVector(new Vector3(...s.normal), distance),
    };
  };
  const opening = contract.screens.UltrawideScreen;
  const openingTarget = new Vector3(...opening.position);
  const openingDistance =
    (Math.min(opening.width / aspect, opening.height) * 0.92) / (2 * tangent);
  const roomFrameSpan = contract.desk.width + 0.12;
  const roomDistance = Math.max(
    2.15,
    roomFrameSpan / aspect / (2 * tangent),
    1.45 / (2 * tangent),
  );
  const roomHeight = Math.min(2.8, Math.max(1.25, roomDistance * 0.58));
  return {
    opening: {
      target: openingTarget,
      position: openingTarget.clone().add(new Vector3(0, 0, openingDistance)),
      fov,
    },
    desktop: {
      target: new Vector3(-0.04, mobile ? 0.26 : 0.34, -0.1),
      position: new Vector3(
        mobile ? 0.02 : 0.18,
        mobile ? 0.48 : 0.56,
        mobile ? 1.05 : 1.25,
      ),
      fov,
    },
    portrait: closeup(contract.screens.PortraitScreen),
    macbook: closeup(contract.screens.MacBookScreen),
    room: {
      target: new Vector3(0, -0.02, -0.08),
      position: new Vector3(0.08, roomHeight, roomDistance),
      fov,
    },
  };
}

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
