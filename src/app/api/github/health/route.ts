import { createStore } from "@/lib/github/store";
import { createActivityStore } from "@/lib/github/activity-store";
import { failureReason } from "@/lib/github/failure";

export const runtime = "nodejs";

/**
 * When the archive and the activity were last refreshed, for the scheduled
 * staleness check (.github/workflows/sync-monitor.yml). Only two timestamps
 * leave the server; whether they are fresh enough is the monitor's call.
 */
export async function GET() {
  const repos = createStore();
  const activity = createActivityStore();
  if (!repos || !activity)
    return Response.json(
      { available: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const [snapshot, state] = await Promise.all([
      repos.read(),
      activity.read(),
    ]);
    return Response.json(
      {
        reposSyncedAt: snapshot.syncedAt,
        activitySyncedAt: state.snapshot?.syncedAt ?? null,
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error(`GitHub health read failed (${failureReason(error)}).`);
    return Response.json(
      { available: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
