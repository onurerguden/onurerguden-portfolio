import "server-only";
import { after, connection } from "next/server";
import {
  isStale,
  refreshActivity,
  sharedReader,
  type ActivitySnapshot,
  type ActivityStore,
} from "./activity-core";
import { createActivityStore } from "./activity-store";
import { localPreviewEnabled, readPreviewActivity } from "./local-preview-core";

export type ActivityResult =
  | { status: "live"; activity: ActivitySnapshot; revision: number }
  | { status: "unavailable" };

type StoredActivity = Awaited<ReturnType<ActivityStore["read"]>>;
// One Redis read per warm instance per minute, however many requests arrive,
// and at most one background refresh in flight.
let shared: {
  store: ActivityStore;
  snapshot: ReturnType<typeof sharedReader<StoredActivity>>;
} | null = null;
let refreshing = false;
function sharedStore() {
  if (shared) return shared;
  const store = createActivityStore(1200);
  if (!store) return null;
  shared = { store, snapshot: sharedReader(() => store.read()) };
  return shared;
}

/**
 * Reads the stored activity snapshot (never GitHub directly) and, when it is
 * stale, refreshes it after the response is sent. Without Redis or a token
 * the page says the data is unavailable instead of showing numbers.
 */
export async function getActivity(): Promise<ActivityResult> {
  if (localPreviewEnabled()) {
    await connection();
    const activity = await readPreviewActivity(process.cwd());
    return activity
      ? { status: "live", activity, revision: Date.parse(activity.syncedAt) }
      : { status: "unavailable" };
  }
  const token = process.env.GITHUB_TOKEN;
  const current = sharedStore();
  if (!current) return { status: "unavailable" };
  const { store, snapshot } = current;
  try {
    const state = await snapshot.read();
    if (token && isStale(state) && !refreshing) {
      refreshing = true;
      after(async () => {
        try {
          if ((await refreshActivity({ store, token })) === "committed")
            snapshot.clear();
        } catch {
          console.error("GitHub activity refresh failed; snapshot retained.");
        } finally {
          refreshing = false;
        }
      });
    }
    return state.snapshot
      ? { status: "live", activity: state.snapshot, revision: state.revision }
      : { status: "unavailable" };
  } catch {
    // No provider errors, tokens or payloads reach the browser.
    return { status: "unavailable" };
  }
}
