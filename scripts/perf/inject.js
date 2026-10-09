// Runs in the page before any of its scripts (Playwright addInitScript) and
// records what a visitor feels while the home page loads: long animation
// frames, the time between frames, and the WebGL calls that block the main
// thread (most of all a shader program waiting to link). It also records
// which canvases drew in each frame and how long the GPU took for them, every
// scroll the page makes itself, and how far the desk's camera moved per
// frame. See measure.mjs.
(() => {
  const config = window.__perfConfig || {};
  const perf = (window.__perf = {
    // [start, interval, scrollY, canvases that drew ("desk,about"), camera
    // step in metres]
    frames: [],
    loaf: [],
    gl: {},
    programs: 0,
    programAt: [],
    contexts: [],
    milestones: {},
    // Per canvas: [frame start, GPU ms] for each frame it drew.
    gpu: {},
    // [time, kind, scrollY before, requested top or null, caller]
    scrolls: [],
    // Scroll events, and how many found style or layout already invalid.
    scrollEvents: 0,
    dirtyScrollEvents: 0,
  });

  // Which scene a canvas belongs to, for the per-canvas numbers. The balls'
  // canvas sits inside the journey's stage too (on the MacBook's screen).
  const labelOf = (canvas) => {
    if (canvas.__perfLabel) return canvas.__perfLabel;
    if (!canvas.isConnected) return "other";
    return (canvas.__perfLabel = canvas.closest("[data-stage-state]")
      ? canvas.closest("#about")
        ? "about"
        : "balls"
      : canvas.closest("[data-journey-stage]")
        ? "desk"
        : "other");
  };
  let deskCanvas = null;
  const findDesk = () =>
    deskCanvas?.isConnected
      ? deskCanvas
      : (deskCanvas = [
          ...document.querySelectorAll("[data-journey-stage] canvas"),
        ].find((canvas) => labelOf(canvas) === "desk"));
  const drawing = new Set();
  let frame = 0;
  let camera = null;

  // Time between animation frames, with the scroll position at each.
  let last = performance.now();
  const tick = (now) => {
    const drew = [...drawing].map(labelOf).join(",");
    drawing.clear();
    let step = 0;
    const desk = findDesk();
    const at = desk?.getAttribute("data-camera");
    if (at) {
      const next = at.split(",").map(Number);
      if (camera) step = Math.hypot(...next.map((v, i) => v - camera[i]));
      camera = next;
    }
    perf.frames.push([
      Math.round(last),
      Math.round(now - last),
      scrollY,
      drew,
      Math.round(step * 1e4) / 1e4,
    ]);
    last = now;
    frame++;
    endGpuQueries();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Scrolls the page makes itself: a correction of under a pixel still
  // cancels the browser's smooth wheel or keyboard scrolling.
  const caller = () =>
    (new Error().stack || "").split("\n")[3]?.trim().slice(0, 140) ?? "";
  const topOf = (args) =>
    typeof args[0] === "object" && args[0] !== null
      ? (args[0].top ?? null)
      : typeof args[1] === "number"
        ? args[1]
        : null;
  for (const [target, name] of [
    [window, "scrollTo"],
    [window, "scroll"],
    [window, "scrollBy"],
    [Element.prototype, "scrollIntoView"],
  ]) {
    const original = target[name];
    target[name] = function (...args) {
      const before = scrollY;
      const top = name === "scrollIntoView" ? null : topOf(args);
      perf.scrolls.push([
        Math.round(performance.now()),
        name,
        Math.round(before * 10) / 10,
        top === null
          ? null
          : Math.round((name === "scrollBy" ? before + top : top) * 10) / 10,
        caller(),
      ]);
      return original.apply(this, args);
    };
  }

  // Whether a scroll event finds style or layout already invalid: reading
  // layout then costs a forced recalculation. Measuring it forces nothing
  // that the page's own reads would not force anyway.
  if (config.probeStyle)
    window.addEventListener(
      "scroll",
      () => {
        perf.scrollEvents++;
        const start = performance.now();
        document.documentElement.getBoundingClientRect();
        if (performance.now() - start > 0.05) perf.dirtyScrollEvents++;
      },
      { capture: true, passive: true },
    );

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        perf.loaf.push({
          start: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
          blocking: Math.round(entry.blockingDuration),
          // Style, layout and paint at the end of the frame, after scripts.
          render: entry.renderStart
            ? Math.round(entry.startTime + entry.duration - entry.renderStart)
            : 0,
          layout: entry.styleAndLayoutStart
            ? Math.round(
                entry.startTime + entry.duration - entry.styleAndLayoutStart,
              )
            : 0,
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
      // The desk sets it while drawing below its top resolution.
      if (
        attributeName === "data-dpr-reduced" &&
        target.hasAttribute("data-dpr-reduced")
      )
        mark(`dpr-reduced:${target.getAttribute("data-dpr-reduced")}`);
      if (attributeName === "data-stage-state")
        mark(
          `stage:${target.closest("[id]")?.id || "?"}:${target.dataset.stageState}`,
        );
    }
  }).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-ready", "data-stage-state", "data-dpr-reduced"],
  });

  let endGpuQueries = () => {};
  if (typeof WebGL2RenderingContext === "undefined") return;
  const proto = WebGL2RenderingContext.prototype;

  // Draw calls mark their canvas as having drawn this frame; with a GPU
  // timer, one query per canvas spans its commands from its first draw of a
  // frame to the next frame.
  const timers = new Map();
  const pending = [];
  const { beginQuery, endQuery, getQueryParameter } = proto;
  const draw = (name) => {
    const original = proto[name];
    proto[name] = function (...args) {
      drawing.add(this.canvas);
      const timer = timers.get(this);
      if (timer && !timer.page && timer.frame !== frame) {
        if (timer.query) {
          endQuery.call(this, timer.ext.TIME_ELAPSED_EXT);
          pending.push([this, timer.query, timer.started]);
        }
        timer.query = this.createQuery();
        timer.frame = frame;
        timer.started = Math.round(last);
        beginQuery.call(this, timer.ext.TIME_ELAPSED_EXT, timer.query);
      }
      return original.apply(this, args);
    };
  };
  for (const name of [
    "drawArrays",
    "drawElements",
    "drawArraysInstanced",
    "drawElementsInstanced",
    "drawRangeElements",
  ])
    draw(name);
  // The desk times its own GPU work (src/components/three/gpu-timer.ts), and
  // only one timer query runs at a time: on a canvas that does, the harness
  // stops its own and records the page's results instead.
  const pageQueries = new Map();
  proto.beginQuery = function (target, query) {
    const timer = timers.get(this);
    if (timer && target === timer.ext.TIME_ELAPSED_EXT) {
      timer.page = true;
      if (timer.query) {
        endQuery.call(this, target);
        pending.push([this, timer.query, timer.started]);
        timer.query = null;
      }
      pageQueries.set(query, Math.round(last));
    }
    return beginQuery.call(this, target, query);
  };
  proto.getQueryParameter = function (query, name) {
    const result = getQueryParameter.call(this, query, name);
    if (name === this.QUERY_RESULT && pageQueries.has(query)) {
      (perf.gpu[labelOf(this.canvas)] ||= []).push([
        pageQueries.get(query),
        Math.round(result / 1e4) / 100,
      ]);
      pageQueries.delete(query);
    }
    return result;
  };
  endGpuQueries = () => {
    for (const [context, timer] of timers)
      if (timer.query && timer.frame !== frame) {
        endQuery.call(context, timer.ext.TIME_ELAPSED_EXT);
        pending.push([context, timer.query, timer.started]);
        timer.query = null;
      }
    for (let i = pending.length - 1; i >= 0; i--) {
      const [context, query, started] = pending[i];
      if (
        !getQueryParameter.call(context, query, context.QUERY_RESULT_AVAILABLE)
      )
        continue;
      pending.splice(i, 1);
      const ext = timers.get(context).ext;
      if (!context.getParameter(ext.GPU_DISJOINT_EXT))
        (perf.gpu[labelOf(context.canvas)] ||= []).push([
          started,
          Math.round(
            getQueryParameter.call(context, query, context.QUERY_RESULT) / 1e4,
          ) / 100,
        ]);
      context.deleteQuery(query);
    }
  };

  // A first visit compiles every shader from scratch; a returning one finds
  // them in the GPU's caches. A branch the compiler cannot remove gives each
  // shader new source on every load, so a fresh profile measures the first
  // visit even on a machine that has compiled the site before.
  // Which shader each program is, by the name three writes into it.
  perf.shaders = [];
  const source = proto.shaderSource;
  proto.shaderSource = function (shader, text) {
    if (!/gl_Position\s*=/.test(text))
      perf.shaders.push([
        Math.round(performance.now()),
        /#define SHADER_NAME (\S+)/.exec(text)?.[1] ??
          (/DEPTH_PACKING/.test(text)
            ? "depth"
            : [...text.matchAll(/uniform \w+ (\w+)/g)]
                .map((match) => match[1])
                .filter(
                  (name) =>
                    !/^(isOrthographic|cameraPosition|viewMatrix|toneMapping)/.test(
                      name,
                    ),
                )
                .slice(0, 4)
                .join(",") || "?"),
      ]);
    return source.call(this, shader, text);
  };
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
    perf.programAt.push(Math.round(performance.now()));
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
      const timer = config.gpu
        ? context.getExtension("EXT_disjoint_timer_query_webgl2")
        : null;
      if (timer) timers.set(context, { ext: timer, frame: -1, query: null });
    }
    return context;
  };
})();
