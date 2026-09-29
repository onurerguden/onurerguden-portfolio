import "server-only";
import { after } from "next/server";
import {
  isStale,
  refreshActivity,
  type ActivitySnapshot,
} from "./activity-core";
import { createActivityStore } from "./activity-store";

export type ActivityResult =
  | { status: "live"; activity: ActivitySnapshot; revision: number }
  | { status: "unavailable" };

/**
 * Reads the stored activity snapshot (never GitHub directly) and, when it is
 * stale, refreshes it after the response is sent. Without Redis or a token
 * the page says the data is unavailable instead of showing numbers.
 */
export async function getActivity(): Promise<ActivityResult> {
  const store = createActivityStore(1200);
  const token = process.env.GITHUB_TOKEN;
  if (!store) return { status: "unavailable" };
  try {
    const state = await store.read();
    if (token && isStale(state))
      after(async () => {
        try {
          await refreshActivity({ store, token });
        } catch {
          console.error("GitHub activity refresh failed; snapshot retained.");
        }
      });
    return state.snapshot
      ? { status: "live", activity: state.snapshot, revision: state.revision }
      : { status: "unavailable" };
  } catch {
    // No provider errors, tokens or payloads reach the browser.
    return { status: "unavailable" };
  }
}
