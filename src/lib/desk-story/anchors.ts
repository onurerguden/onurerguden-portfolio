import { Vector3 } from "three";
import contract from "../desk-scene.json";
import { closeupMargin, screens, type CameraStop } from "./camera";

export type CameraAnchor = { target: Vector3; position: Vector3; fov: number };

const fov = 43;
const tangent = Math.tan((fov * Math.PI) / 360);

/**
 * Camera positions for every stop, for a canvas of `width` × `height` CSS px.
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
