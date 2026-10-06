/**
 * The daily reconciliation's verdict. Only a run that refreshed both the
 * repositories and the activity counts as done; a run that was turned away
 * (another refresh holding the lock, GitHub's backoff) is "skipped", which is
 * not an error but must not look like success either.
 */
export type CronStatus = "ok" | "skipped" | "failed";

export function cronStatus(
  repos: "updated" | "duplicate" | "busy" | "failed",
  activity: "committed" | "skipped" | "stale" | "failed" | "unconfigured",
): CronStatus {
  if (repos === "failed" || activity === "failed") return "failed";
  if (repos === "updated" && activity === "committed") return "ok";
  return "skipped";
}

/**
 * Tells an uptime monitor the run succeeded. Never throws, and never logs the
 * URL, which is a credential for the monitor.
 */
export async function pingHeartbeat(
  url: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!url) return false;
  try {
    const response = await fetcher(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) return true;
  } catch {}
  console.error("Cron heartbeat failed.");
  return false;
}
