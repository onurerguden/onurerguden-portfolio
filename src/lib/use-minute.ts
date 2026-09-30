import { useSyncExternalStore } from "react";

/** Calls `onChange` just after each minute begins. */
function subscribe(onChange: () => void) {
  let timer = 0;
  const wait = () => 60_000 - (Date.now() % 60_000) + 50;
  const tick = () => {
    onChange();
    timer = window.setTimeout(tick, wait());
  };
  timer = window.setTimeout(tick, wait());
  return () => window.clearTimeout(timer);
}

const minute = () => Math.floor(Date.now() / 60_000) * 60_000;

/**
 * The current minute as a timestamp, updated on the minute. It is null while
 * server rendering and hydrating, so text that depends on the time is only
 * written in the browser and never mismatches.
 */
export function useMinute() {
  return useSyncExternalStore(subscribe, minute, () => null);
}
