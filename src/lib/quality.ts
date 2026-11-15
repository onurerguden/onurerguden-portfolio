/**
 * How much 3D this computer gets, decided once per visit:
 *
 * - high: the full desk (Apple silicon, dedicated graphics, unknown GPUs).
 * - low: the same desk at 1 device pixel per CSS pixel (0.85 if still
 *   slow), without multisampling, the sun's and the lamp's shadows or the
 *   three small glow lights, on a grid of half the density; section scenes
 *   at 1 without multisampling (integrated Intel and AMD graphics, Intel Macs
 *   in Safari, or a computer with little memory or few cores).
 * - static: the plain flow phones get (no GPU acceleration at all).
 *
 * Unknown GPUs start high; the desk's frame timing lowers its resolution if
 * its frames run slow (src/lib/desk-story/frame-budget.ts). If even its
 * lowest resolution misses the display's budget, the computer is slower than
 * its name suggests: the scenes that mount after that, and visits in the
 * following week, get the low tier (`demoteQuality`). A visitor's own choice
 * ("portfolio:quality" in localStorage) wins over both, which QA also uses.
 */
export type Quality = "high" | "low" | "static";

export const qualityKey = "portfolio:quality";

const software = /swiftshader|llvmpipe|softpipe|software|basic render/i;
/** Integrated graphics that render the desk slowly at a dense resolution. */
const integrated =
  /intel.*(uhd|hd graphics|iris)|intel\(r\) graphics|\bhd graphics\b|amd radeon\(tm\) graphics|radeon(?:\(tm\))? (?:r[2-7]|vega \d+) graphics|radeon(?:\(tm\))? 610m|mali|adreno|powervr/i;
const dedicated =
  /apple (?:m\d|gpu)|nvidia|geforce|quadro|rtx|radeon (?:rx|pro)|intel.*arc/i;

export function classifyGpu({
  renderer,
  memory,
  cores,
  astc,
}: {
  /** UNMASKED_RENDERER_WEBGL, or "" where the browser hides it. */
  renderer: string;
  /** navigator.deviceMemory in GB, where the browser reports it. */
  memory?: number;
  /** navigator.hardwareConcurrency. */
  cores?: number;
  /** Whether the GPU decodes ASTC textures, which every Apple-designed GPU does. */
  astc?: boolean;
}): Quality {
  if (software.test(renderer)) return "static";
  // Safari names every Mac GPU "Apple GPU"; an Intel Mac's lacks ASTC.
  if (/^apple gpu$/i.test(renderer.trim()) && astc === false) return "low";
  if (dedicated.test(renderer)) return "high";
  if (integrated.test(renderer)) return "low";
  if (
    (memory !== undefined && memory <= 4) ||
    (cores !== undefined && cores <= 4)
  )
    return "low";
  return "high";
}

const choices: Quality[] = ["high", "low", "static"];
let decided: Quality | null = null;
/** The visitor (or QA) chose the tier; nothing overrides it. */
let chosen = false;

const learnedKey = "portfolio:quality-learned";
const learnedMs = 7 * 24 * 60 * 60 * 1000;

/** This computer proved slow within the last week (see demoteQuality). */
function learnedLow() {
  try {
    const saved = JSON.parse(localStorage.getItem(learnedKey) ?? "null") as {
      at?: unknown;
    } | null;
    return (
      typeof saved?.at === "number" &&
      saved.at <= Date.now() &&
      Date.now() - saved.at < learnedMs
    );
  } catch {
    // Storage can be blocked or hold something else; trust the probe.
    return false;
  }
}

/**
 * The desk could not keep up even at its lowest resolution: everything that
 * mounts from now on (the section scenes, the desk after a release) and the
 * next week's visits get the low tier. A visitor's own choice stands.
 */
export function demoteQuality() {
  // quality() first: it is what learns whether the visitor chose.
  if (quality() !== "high" || chosen) return;
  decided = "low";
  document.documentElement.dataset.quality = decided;
  try {
    localStorage.setItem(learnedKey, JSON.stringify({ at: Date.now() }));
  } catch {
    // Storage can be blocked; the next visit probes again.
  }
}

export type WebGLProbe = {
  /** A WebGL2 context could be created. */
  webgl2: boolean;
  /** UNMASKED_RENDERER_WEBGL, or "" where the browser hides it. */
  renderer: string;
  /** The GPU decodes ASTC textures. */
  astc: boolean;
};
let probed: WebGLProbe | null = null;

/**
 * One throwaway WebGL2 context per visit, on a detached canvas so page
 * locators never see it, lost again at once. The quality tier and the
 * section stages (use-section-stage.ts) both read it: creating a context
 * costs milliseconds at boot, so they share one.
 */
export function probeWebGL(): WebGLProbe {
  if (probed) return probed;
  let webgl2 = false;
  let renderer = "";
  let astc = false;
  try {
    const context = document.createElement("canvas").getContext("webgl2");
    webgl2 = Boolean(context);
    const info = context?.getExtension("WEBGL_debug_renderer_info");
    renderer = info
      ? String(context?.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : "";
    astc = Boolean(context?.getExtension("WEBGL_compressed_texture_astc"));
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // No WebGL at all: the scenes fail on their own and fall back.
  }
  return (probed = { webgl2, renderer, astc });
}

/** The visit's quality, decided once from the probe. */
export function quality(): Quality {
  if (decided) return decided;
  if (typeof window === "undefined") return "high";
  try {
    const choice = localStorage.getItem(qualityKey) as Quality | null;
    if (choice && choices.includes(choice)) {
      chosen = true;
      return (decided = choice);
    }
  } catch {
    // Storage can be blocked; probe instead.
  }
  const { renderer, astc } = probeWebGL();
  const nav = navigator as Navigator & { deviceMemory?: number };
  decided = classifyGpu({
    renderer,
    astc,
    memory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
  });
  if (decided === "high" && learnedLow()) decided = "low";
  document.documentElement.dataset.quality = decided;
  return decided;
}
