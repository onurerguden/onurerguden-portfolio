import revisions from "./audio-assets.json";

/*
 * The headphones' music (October 24, desk delight): one player for the whole
 * visit, outside React, so it plays on past the desk, through the scene's
 * release and client-side navigation. Nothing is fetched before the first
 * click; Opus in WebM where the browser plays it, AAC otherwise.
 */
export type MusicStatus = "idle" | "loading" | "playing" | "paused" | "error";
export type MusicSource = { src: string; type: string };
export type MusicTrack = { title: string; sources: readonly MusicSource[] };

const audioAsset = (file: keyof typeof revisions) =>
  `/${file}?v=${revisions[file]}`;
export const deskTrack: MusicTrack = {
  title: "Jazz — mondamusic (Pixabay)",
  sources: [
    {
      src: audioAsset("audio/desk-jazz.webm"),
      type: 'audio/webm; codecs="opus"',
    },
    {
      src: audioAsset("audio/desk-jazz.m4a"),
      type: 'audio/mp4; codecs="mp4a.40.2"',
    },
  ],
};
/** The music sits under the page, not over it. */
export const musicVolume = 0.35;
export const fadeIn = 1200;
export const fadeOut = 400;

type Media = Pick<
  HTMLAudioElement,
  | "play"
  | "pause"
  | "canPlayType"
  | "addEventListener"
  | "removeAttribute"
  | "load"
> & {
  src: string;
  preload: string;
  loop: boolean;
  volume: number;
  paused: boolean;
};
export type MusicEnvironment = {
  createAudio: () => Media;
  now: () => number;
  frame: (callback: () => void) => unknown;
  /** Visibility changes: hidden pauses, visible resumes what was playing. */
  onVisibility: (listener: (hidden: boolean) => void) => void;
};

export function createDeskMusic(track: MusicTrack, env: MusicEnvironment) {
  let status: MusicStatus = "idle";
  let audio: Media | undefined;
  let source = -1;
  let wanted = false;
  let resumeOnShow = false;
  let generation = 0;
  // Pauses this player makes itself, so a pause from elsewhere (the
  // system's media keys) can be told apart.
  let ownPause = false;
  let fade = 0;
  const listeners = new Set<() => void>();
  const set = (next: MusicStatus) => {
    if (next === status) return;
    status = next;
    for (const listener of listeners) listener();
  };
  const ramp = (to: number, ms: number, done?: () => void) => {
    if (!audio) return;
    const media = audio;
    const id = ++fade;
    const from = media.volume;
    const start = env.now();
    const step = () => {
      if (id !== fade) return;
      const t = Math.min(1, (env.now() - start) / ms);
      media.volume = from + (to - from) * t;
      if (t < 1) env.frame(step);
      else done?.();
    };
    step();
  };
  const halt = () => {
    if (!audio || audio.paused) return;
    ownPause = true;
    audio.pause();
    ownPause = false;
  };
  const load = (index: number) => {
    const media = audio!;
    source = index;
    media.src = track.sources[index].src;
  };
  const create = () => {
    const media = env.createAudio();
    audio = media;
    media.preload = "none";
    media.loop = true;
    media.volume = 0;
    const first = track.sources.findIndex(({ type }) =>
      media.canPlayType(type),
    );
    media.addEventListener("error", () => {
      // The other format once, then give up.
      if (source + 1 < track.sources.length && wanted) {
        load(source + 1);
        start();
        return;
      }
      wanted = false;
      generation++;
      set("error");
    });
    media.addEventListener("pause", () => {
      if (ownPause || !wanted) return;
      wanted = false;
      generation++;
      set("paused");
    });
    media.addEventListener("play", () => {
      if (wanted) return;
      // Played from elsewhere (media keys): follow it.
      wanted = true;
      set("playing");
      ramp(musicVolume, fadeIn);
    });
    load(Math.max(0, first));
    return media;
  };
  const start = () => {
    const media = audio ?? create();
    wanted = true;
    set("loading");
    const attempt = ++generation;
    void media
      .play()
      .then(() => {
        if (attempt !== generation) {
          if (!wanted) halt();
          return;
        }
        set("playing");
        ramp(musicVolume, fadeIn);
      })
      .catch(() => {
        if (attempt !== generation) return;
        wanted = false;
        set("error");
      });
  };
  const stop = () => {
    wanted = false;
    resumeOnShow = false;
    generation++;
    set("paused");
    ramp(0, fadeOut, halt);
  };
  env.onVisibility((hidden) => {
    if (hidden) {
      resumeOnShow = wanted;
      if (!wanted) return;
      // Frames stop in a hidden tab, so no fade: quiet at once.
      wanted = false;
      generation++;
      fade++;
      halt();
      set("paused");
    } else if (resumeOnShow) {
      resumeOnShow = false;
      if (audio) audio.volume = 0;
      start();
    }
  });
  return {
    status: () => status,
    title: track.title,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Plays or pauses; called inside the click, as browsers require. */
    toggle() {
      if (wanted) stop();
      else start();
    },
    pause: stop,
  };
}
export type DeskMusic = ReturnType<typeof createDeskMusic>;

/** The visit's one player, created on first use (kept across hot reloads). */
export function deskMusic(): DeskMusic {
  const scope = globalThis as { __deskMusic?: DeskMusic };
  scope.__deskMusic ??= createDeskMusic(deskTrack, {
    createAudio: () => new Audio(),
    now: () => performance.now(),
    frame: (callback) => requestAnimationFrame(callback),
    onVisibility: (listener) =>
      document.addEventListener("visibilitychange", () =>
        listener(document.hidden),
      ),
  });
  return scope.__deskMusic;
}
