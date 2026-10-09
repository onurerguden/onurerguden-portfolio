import type { Scene, WebGLRenderer } from "three";

/**
 * A warm context that may compile programs for a scene not mounted yet.
 *
 * The browser's GPU process caches every program it links, for all of the
 * page's contexts: a program linked once in the desk's context links in a
 * fraction of the time when the About scene's own context asks for the very
 * same source later (measured on an M1 Pro: 216–291 ms cold, 15–47 ms
 * after). The desk offers its context once it is warm.
 */
type Host = { gl: WebGLRenderer; scene: Scene };
let host: Host | null = null;

/** Offers `gl` as the host; returns a function that withdraws it. */
export function offerProgramHost(gl: WebGLRenderer, scene: Scene) {
  const offer = { gl, scene };
  host = offer;
  return () => {
    if (host === offer) host = null;
  };
}

export const programHost = () => host;
