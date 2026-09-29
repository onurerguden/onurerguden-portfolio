import { timingSafeEqual } from "node:crypto";
import { synchronize } from "@/lib/github/core";
import { createStore } from "@/lib/github/store";
import { refreshActivity } from "@/lib/github/activity-core";
import { createActivityStore } from "@/lib/github/activity-store";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const store = createStore();
  const token = process.env.GITHUB_TOKEN;
  if (!store || !token)
    return Response.json({ error: "Integration unavailable" }, { status: 503 });
  let repos: unknown = null;
  let activity: unknown = null;
  try {
    repos = await synchronize(store, token, `cron-${crypto.randomUUID()}`);
  } catch {
    console.error("GitHub reconciliation failed; prior snapshot retained.");
  }
  // The daily full refresh also recovers any missed webhook or background work.
  const activityStore = createActivityStore();
  if (activityStore)
    try {
      activity = await refreshActivity({
        store: activityStore,
        token,
        full: true,
        force: true,
      });
    } catch {
      console.error(
        "GitHub activity reconciliation failed; snapshot retained.",
      );
    }
  if (repos === null || (activityStore && activity === null))
    return Response.json({ error: "Reconciliation failed" }, { status: 503 });
  return Response.json({ ok: true, result: repos, activity });
}
