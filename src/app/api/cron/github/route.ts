import { timingSafeEqual } from "node:crypto";
import { synchronize } from "@/lib/github/core";
import { createStore } from "@/lib/github/store";
import { refreshActivity } from "@/lib/github/activity-core";
import { createActivityStore } from "@/lib/github/activity-store";
import { cronStatus, pingHeartbeat } from "@/lib/github/cron";

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
  let repos: Parameters<typeof cronStatus>[0] = "failed";
  let activity: Parameters<typeof cronStatus>[1] = "unconfigured";
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
      activity = "failed";
      console.error(
        "GitHub activity reconciliation failed; snapshot retained.",
      );
    }
  // Without Redis for activity there is no full success to report.
  const status = cronStatus(repos, activity);
  let lastSuccess: string | null = null;
  try {
    if (status === "ok") {
      lastSuccess = new Date().toISOString();
      await store.markSuccess(lastSuccess);
    } else lastSuccess = await store.lastSuccess();
  } catch {
    console.error("Could not record the reconciliation time.");
  }
  // Only a full success tells the uptime monitor all is well.
  if (status === "ok") await pingHeartbeat(process.env.CRON_HEARTBEAT_URL);
  else
    console.error(
      `GitHub reconciliation ${status}: repos ${repos}, activity ${activity}.`,
    );
  return Response.json(
    { status, repos, activity, lastSuccess },
    { status: status === "failed" ? 503 : 200 },
  );
}
