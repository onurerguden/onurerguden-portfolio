// Reads a Chrome trace of one visit (measure.mjs --trace) and says where the
// renderer's main thread spent each frame while the visitor scrolled: script,
// style, layout and paint, the layout that scripts forced, the cost of each
// wheel and scroll event, and the frames the compositor drew without the
// main thread's update (partial) or skipped (dropped).

const script = new Set([
  "EvaluateScript",
  "FunctionCall",
  "EventDispatch",
  "TimerFire",
  "FireAnimationFrame",
  "FireIdleCallback",
  "v8.callFunction",
  "V8.Execute",
]);
const kinds = {
  UpdateLayoutTree: "style",
  Layout: "layout",
  PrePaint: "prePaint",
  Paint: "paint",
  Layerize: "layerize",
  Commit: "commit",
  MinorGC: "gc",
  MajorGC: "gc",
  "V8.GC_SCAVENGER": "gc",
  "V8.GC_MARK_COMPACTOR": "gc",
};

const quantile = (list, q) => {
  if (!list.length) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
};
const round = (n) => Math.round(n * 100) / 100;

/**
 * @param events the trace's traceEvents
 * @param window [start, end] of the scrolling, in the page's performance.now()
 * @param frames measure.mjs frame records ([start, interval, ...])
 */
export function summarizeTrace(events, window, frames) {
  // The page's main thread: the renderer main thread with the most work.
  const names = new Map();
  for (const event of events)
    if (event.ph === "M" && event.name === "thread_name")
      names.set(`${event.pid}:${event.tid}`, event.args?.name);
  const busy = new Map();
  for (const event of events) {
    const key = `${event.pid}:${event.tid}`;
    if (names.get(key) === "CrRendererMain" && event.ph === "X")
      busy.set(key, (busy.get(key) || 0) + (event.dur || 0));
  }
  const main = [...busy].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!main) return null;
  const [pid] = main.split(":");

  // performance.now() is relative to navigationStart; trace times are not.
  const origin = events.find(
    (event) =>
      event.name === "navigationStart" &&
      String(event.pid) === pid &&
      event.args?.data?.isLoadingMainFrame !== false,
  )?.ts;
  if (origin === undefined) return null;
  const toPage = (ts) => (ts - origin) / 1000;
  const [from, to] = window;

  const own = events
    .filter(
      (event) =>
        `${event.pid}:${event.tid}` === main &&
        event.ph === "X" &&
        toPage(event.ts) >= from &&
        toPage(event.ts) <= to,
    )
    .sort((a, b) => a.ts - b.ts);

  const totals = { script: 0, style: 0, layout: 0, prePaint: 0, paint: 0 };
  Object.assign(totals, { layerize: 0, commit: 0, gc: 0 });
  let forced = 0;
  let forcedCount = 0;
  const handlers = { wheel: [], scroll: [] };
  // Script events that are still running, to tell forced layout from the
  // layout at the end of a frame.
  const open = [];
  for (const event of own) {
    while (open.length && open.at(-1) <= event.ts) open.pop();
    const kind = kinds[event.name];
    if (script.has(event.name)) {
      if (!open.length) totals.script += event.dur / 1000;
      open.push(event.ts + event.dur);
      const type = event.args?.data?.type;
      if (event.name === "EventDispatch" && type in handlers)
        handlers[type].push(event.dur / 1000);
    } else if (kind) {
      totals[kind] += event.dur / 1000;
      if ((kind === "style" || kind === "layout") && open.length) {
        forced += event.dur / 1000;
        forcedCount++;
      }
    }
  }

  // Main-thread time inside each animation frame of the scroll.
  const tasks = own.filter((event) => event.name === "RunTask");
  const perFrame = frames
    .filter(([start]) => start >= from && start <= to)
    .map(([start, interval]) => {
      const end = start + interval;
      let sum = 0;
      for (const task of tasks) {
        const a = toPage(task.ts);
        const b = a + task.dur / 1000;
        if (b > start && a < end) sum += Math.min(b, end) - Math.max(a, start);
      }
      return sum;
    });

  // The page compositor's verdict on each frame that had something to show.
  const states = {};
  for (const event of events)
    if (
      event.name === "PipelineReporter" &&
      event.ph === "b" &&
      String(event.pid) === pid &&
      toPage(event.ts) >= from &&
      toPage(event.ts) <= to
    ) {
      const reporter =
        event.args?.frame_reporter ?? event.args?.chrome_frame_reporter;
      const state = reporter?.state;
      if (state && state !== "STATE_NO_UPDATE_DESIRED")
        states[state] = (states[state] || 0) + 1;
    }
  const produced = Object.values(states).reduce((sum, n) => sum + n, 0);

  return {
    totals: Object.fromEntries(
      Object.entries(totals).map(([kind, ms]) => [kind, Math.round(ms)]),
    ),
    forcedLayoutMs: Math.round(forced),
    forcedLayouts: forcedCount,
    wheelEvents: handlers.wheel.length,
    wheelMs: round(
      handlers.wheel.reduce((sum, ms) => sum + ms, 0) /
        Math.max(1, handlers.wheel.length),
    ),
    scrollEvents: handlers.scroll.length,
    scrollMs: round(
      handlers.scroll.reduce((sum, ms) => sum + ms, 0) /
        Math.max(1, handlers.scroll.length),
    ),
    mainP50: round(quantile(perFrame, 0.5)),
    mainP95: round(quantile(perFrame, 0.95)),
    mainP99: round(quantile(perFrame, 0.99)),
    mainOver8: perFrame.filter((ms) => ms > 8.3).length,
    frames: produced,
    partial: states.STATE_PRESENTED_PARTIAL || 0,
    dropped: states.STATE_DROPPED || 0,
    partialShare: produced
      ? round((100 * (states.STATE_PRESENTED_PARTIAL || 0)) / produced)
      : 0,
  };
}

/** Reads a trace that the browser returned as a stream (Tracing.end). */
export async function readTrace(cdp, stream) {
  let text = "";
  for (;;) {
    const chunk = await cdp.send("IO.read", { handle: stream, size: 1 << 22 });
    text += chunk.base64Encoded
      ? Buffer.from(chunk.data, "base64").toString()
      : chunk.data;
    if (chunk.eof) break;
  }
  await cdp.send("IO.close", { handle: stream });
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.traceEvents;
}
