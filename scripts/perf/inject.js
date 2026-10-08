// Runs in the page before any of its scripts (Playwright addInitScript) and
// records what a visitor feels while the home page loads: long animation
// frames, the time between frames, and the WebGL calls that block the main
// thread (most of all a shader program waiting to link). See measure.mjs.
(() => {
  const config = window.__perfConfig || {};
  const perf = (window.__perf = {
    frames: [],
    loaf: [],
    gl: {},
    programs: 0,
    contexts: [],
    milestones: {},
  });

  // Time between animation frames, with the scroll position at each.
  let last = performance.now();
  const tick = (now) => {
    perf.frames.push([Math.round(last), Math.round(now - last), scrollY]);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        perf.loaf.push({
          start: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
          blocking: Math.round(entry.blockingDuration),
          scripts: (entry.scripts || [])
            .map((script) => ({
              invoker: (script.invoker || "").slice(0, 80),
              source: (script.sourceURL || "").split("/").pop(),
              duration: Math.round(script.duration),
              layout: Math.round(script.forcedStyleAndLayoutDuration || 0),
            }))
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 3),
        });
    }).observe({ type: "long-animation-frame", buffered: true });
    new PerformanceObserver((list) => {
      perf.lcp = list.getEntries().at(-1)?.startTime ?? perf.lcp;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // Long animation frames are Chromium-only; frame times still record.
  }

  // When the desk and the section scenes become ready or live.
  const mark = (name) => {
    if (!(name in perf.milestones))
      perf.milestones[name] = Math.round(performance.now());
  };
  new MutationObserver((records) => {
    for (const { target, attributeName } of records) {
      if (!(target instanceof HTMLElement)) continue;
      if (attributeName === "data-ready" && target.dataset.ready === "true")
        mark("desk-ready");
      if (attributeName === "data-stage-state")
        mark(
          `stage:${target.closest("[id]")?.id || "?"}:${target.dataset.stageState}`,
        );
    }
  }).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-ready", "data-stage-state"],
  });

  if (typeof WebGL2RenderingContext === "undefined") return;
  const proto = WebGL2RenderingContext.prototype;

  // A first visit compiles every shader from scratch; a returning one finds
  // them in the GPU's caches. A branch the compiler cannot remove gives each
  // shader new source on every load, so a fresh profile measures the first
  // visit even on a machine that has compiled the site before.
  if (config.bustShaderCache) {
    const salt = 1 + Math.floor(Math.random() * 1e6);
    const shaderSource = proto.shaderSource;
    proto.shaderSource = function (shader, source) {
      const vertex = /gl_Position\s*=/.test(source);
      const branch = vertex
        ? ` if (gl_VertexID == -${salt}) gl_Position.w += 1.0;`
        : ` if (gl_FragCoord.x < -${salt}.5) discard;`;
      return shaderSource.call(
        this,
        shader,
        source.replace(/void\s+main\s*\(\s*\)\s*\{/, (m) => m + branch),
      );
    };
  }

  // Calls that wait for the GPU process: their time is time the page froze.
  const blocking = [
    "getProgramInfoLog",
    "getProgramParameter",
    "getShaderInfoLog",
    "getShaderParameter",
    "getActiveUniform",
    "getUniformLocation",
    "getAttribLocation",
    "getError",
    "readPixels",
    "texImage2D",
    "texSubImage2D",
    "texStorage2D",
    "generateMipmap",
    "linkProgram",
  ];
  for (const name of blocking) {
    const original = proto[name];
    if (typeof original !== "function") continue;
    proto[name] = function (...args) {
      const start = performance.now();
      const result = original.apply(this, args);
      const time = performance.now() - start;
      if (time > 0.5) {
        const entry = (perf.gl[name] ||= { calls: 0, ms: 0, max: 0, at: [] });
        entry.calls++;
        entry.ms += time;
        entry.max = Math.max(entry.max, time);
        if (time > 16) entry.at.push([Math.round(start), Math.round(time)]);
      }
      return result;
    };
  }
  const createProgram = proto.createProgram;
  proto.createProgram = function (...args) {
    perf.programs++;
    return createProgram.apply(this, args);
  };

  // Which GPU and which extensions each context got.
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const context = getContext.call(this, type, ...rest);
    if (context && type === "webgl2" && !this.__perfSeen) {
      this.__perfSeen = true;
      const info = context.getExtension("WEBGL_debug_renderer_info");
      perf.contexts.push({
        at: Math.round(performance.now()),
        renderer: info
          ? context.getParameter(info.UNMASKED_RENDERER_WEBGL)
          : "unknown",
        parallelCompile: !!context.getExtension("KHR_parallel_shader_compile"),
        antialias: context.getContextAttributes()?.antialias,
      });
    }
    return context;
  };
})();
