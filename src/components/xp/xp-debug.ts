import { laptopPhase } from "@/lib/desk-story/store";
import { stageRegistry } from "@/lib/stage-registry";
import { sim } from "./xp-sim";

/**
 * Temporary on-device diagnostics for the balls (?balls-debug). Prints the
 * stage, story and simulation state in a fixed box so a phone screenshot
 * shows where the drop stops. `&flat=1` drops the screen panels' 3D
 * compositing hints to test WebKit's canvas compositing.
 */
export function startBallsDebug() {
  const params = new URLSearchParams(location.search);
  if (!params.has("balls-debug")) return () => {};
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" ").slice(0, 160));
    originalError(...args);
  };
  const onError = (event: ErrorEvent) =>
    errors.push(String(event.message).slice(0, 160));
  window.addEventListener("error", onError);
  if (params.get("flat") === "1") {
    const style = document.createElement("style");
    style.textContent =
      "[data-screen],[data-screen]>div{-webkit-backface-visibility:visible!important;backface-visibility:visible!important;will-change:auto!important;contain:none!important}";
    document.head.append(style);
  }
  let renderer = "?";
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    renderer = gl
      ? info
        ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
        : "no debug info"
      : "no webgl2";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch (error) {
    renderer = `error ${error}`;
  }
  const box = document.createElement("pre");
  box.style.cssText =
    "position:fixed;z-index:99999;left:4px;right:4px;bottom:4px;margin:0;padding:6px;font:10px/1.3 ui-monospace,monospace;background:rgba(0,0,0,.82);color:#d8f23c;white-space:pre-wrap;pointer-events:none;max-height:45vh;overflow:hidden";
  document.body.append(box);
  const timer = window.setInterval(() => {
    const story = document.querySelector<HTMLElement>("[data-story]");
    const holder = document.querySelector<HTMLElement>(
      "[data-xp] [data-stage-state]",
    );
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[data-stage-canvas="desk-stack"]',
    );
    const panel = document.querySelector<HTMLElement>('[data-screen="2"]');
    const world = sim.world;
    const motion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.textContent = [
      `ua ${navigator.userAgent.slice(0, 110)}`,
      `renderer ${renderer} | reduced ${motion} | paused ${document.documentElement.dataset.motionPaused}`,
      `journey enhanced ${story?.dataset.enhanced} ready ${story?.dataset.ready} static ${story?.dataset.static} d ${story?.dataset.distance}`,
      `phase ${laptopPhase.get()} | live ${[...stageRegistry.liveIds()].join(",")} | stage ${holder?.dataset.stageState}`,
      `panel takeover ${panel?.dataset.takeover} vis ${panel?.style.visibility} | holder ${holder?.offsetWidth}x${holder?.offsetHeight}`,
      canvas
        ? `canvas ${canvas.width}x${canvas.height} css ${canvas.offsetWidth}x${canvas.offsetHeight} active ${canvas.dataset.stageActive} frames ${canvas.dataset.stageFrames} mode ${canvas.dataset.physicsMode} settled ${canvas.dataset.physicsSettled}`
        : "canvas none",
      world
        ? `sim ${sim.mode} ${world.count} balls, ball0 y ${world.py[0]?.toFixed(0)} of ${sim.height}`
        : "sim none",
      `canvases ${document.querySelectorAll("canvas").length} | flat ${params.get("flat") === "1"}`,
      ...errors.slice(-4),
    ].join("\n");
  }, 400);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("error", onError);
    console.error = originalError;
    box.remove();
  };
}
