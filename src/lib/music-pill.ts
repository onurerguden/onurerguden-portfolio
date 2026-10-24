import type { DeskMusic, MusicStatus } from "./desk-music";

/*
 * The music's own control, once the headphones have started it (October
 * 24): a small button at the bottom left that pauses and plays again from
 * anywhere on the site, since the headphones scroll away with the desk.
 * Plain DOM on <body>, so neither the desk's release nor a client-side
 * navigation removes it; its styles are injected here rather than shipped
 * with every first load.
 */
const copy = {
  en: {
    pause: "Pause music",
    play: "Play music",
    error: "Music could not play.",
  },
  tr: {
    pause: "Müziği duraklat",
    play: "Müziği çal",
    error: "Müzik çalınamadı.",
  },
};
const css = `[data-music-pill]{position:fixed;left:16px;bottom:16px;z-index:60;display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:0 16px 0 14px;border:1px solid #ffffff2e;border-radius:22px;background:#0b1222eb;color:#f5f6f8;font:500 13px/1 "Manrope Variable",sans-serif;box-shadow:0 8px 24px #0006;cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s}
[data-music-pill][data-shown]{opacity:1;transform:none}
[data-music-pill]:focus-visible{outline:2px solid #d8f23c;outline-offset:3px}
[data-music-pill] i{display:inline-flex;gap:2px;align-items:flex-end;height:14px}
[data-music-pill] i b{width:3px;height:100%;border-radius:1px;background:#d8f23c;transform:scaleY(.35);transform-origin:bottom}
[data-music-pill][data-state=playing] i b{animation:desk-eq .8s ease-in-out infinite alternate}
[data-music-pill] i b:nth-child(2){animation-delay:-.27s}
[data-music-pill] i b:nth-child(3){animation-delay:-.53s}
[data-music-pill] span[role=status]{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@keyframes desk-eq{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
html[data-motion-paused=true] [data-music-pill] i b{animation:none}
@media (prefers-reduced-motion:reduce){[data-music-pill]{transition:none}[data-music-pill] i b{animation:none}}
@media print{[data-music-pill]{display:none}}`;

const language = () =>
  document.documentElement.lang.startsWith("tr") ? "tr" : "en";

/** Shows the pill from the music's first start on; idempotent. */
export function attachMusicPill(music: DeskMusic, qa: boolean) {
  if (document.querySelector("[data-music-pill]")) return;
  const style = document.createElement("style");
  style.dataset.musicPill = "";
  style.textContent = css;
  document.head.append(style);
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("data-music-pill", "");
  const bars = document.createElement("i");
  bars.setAttribute("aria-hidden", "true");
  bars.append(...[0, 1, 2].map(() => document.createElement("b")));
  const label = document.createElement("span");
  const status = document.createElement("span");
  status.setAttribute("role", "status");
  button.append(bars, label, status);
  const render = () => {
    const state: MusicStatus = music.status();
    const t = copy[language()];
    const on = state === "playing" || state === "loading";
    button.dataset.state = state;
    label.textContent = on ? t.pause : t.play;
    status.textContent = state === "error" ? t.error : "";
    if (qa) document.documentElement.dataset.music = state;
  };
  button.addEventListener("click", () => music.toggle());
  music.subscribe(render);
  // The language changes with a client-side navigation between /en and /tr.
  new MutationObserver(render).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  render();
  document.body.append(button);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => button.setAttribute("data-shown", "")),
  );
}
