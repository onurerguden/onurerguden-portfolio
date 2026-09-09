export type DeskTrack = { src?: string; title?: string };
// Add the supplied publication-ready audio path and title here. No placeholder track.
export const deskTrack: DeskTrack = {};
export type AudioStatus =
  "idle" | "loading" | "playing" | "paused" | "missing" | "error";

/** A single lazy audio instance; invalidates pending play promises on pause/dispose. */
export function createDeskAudio(
  track: DeskTrack,
  onStatus: (status: AudioStatus) => void,
  factory = () => new Audio(),
) {
  let audio: HTMLAudioElement | undefined;
  let requested = false;
  let generation = 0;
  let disposed = false;
  const pause = () => {
    generation++;
    requested = false;
    audio?.pause();
    if (audio && !disposed) onStatus("paused");
  };
  return {
    toggle() {
      if (disposed) return;
      if (!track.src) {
        onStatus("missing");
        return;
      }
      if (requested) {
        pause();
        return;
      }
      if (!audio) {
        audio = factory();
        audio.preload = "none";
        audio.src = track.src;
        audio.volume = 0.35;
        audio.onended = () => {
          requested = false;
          onStatus("paused");
        };
        audio.onerror = () => {
          requested = false;
          generation++;
          onStatus("error");
        };
      }
      requested = true;
      const attempt = ++generation;
      onStatus("loading");
      void audio
        .play()
        .then(() => {
          if (disposed || attempt !== generation) {
            if (!requested) audio?.pause();
            return;
          }
          onStatus("playing");
        })
        .catch(() => {
          if (disposed || attempt !== generation) return;
          requested = false;
          onStatus("error");
        });
    },
    pause,
    dispose() {
      disposed = true;
      pause();
      if (audio) {
        audio.onended = audio.onerror = null;
        audio.removeAttribute("src");
        audio.load();
      }
    },
  };
}
