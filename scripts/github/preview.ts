import { execFile, spawn } from "node:child_process";
import { setDefaultResultOrder } from "node:dns";
import { promisify } from "node:util";
import path from "node:path";
import {
  fetchActivity,
  type ActivitySnapshot,
} from "../../src/lib/github/activity-core";
import { fetchPublicRepos, OWNER } from "../../src/lib/github/core";
import { writePreviewSnapshot } from "../../src/lib/github/local-preview-core";

const run = promisify(execFile);
const args = process.argv.slice(2);
const port = args.length ? Number(args[1]) : 3103;
if (
  (args.length && (args.length !== 2 || args[0] !== "--port")) ||
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  process.env.VERCEL
) {
  console.error(
    "Use npm run preview:github -- --port 3103 on your own computer.",
  );
  process.exit(1);
}

const root = process.cwd();
let previous: ActivitySnapshot | null = null;
let etag: string | null = null;
let activityRetryAt = 0;
let reposRetryAt = 0;
let lastFull = 0;
let initialized = false;

async function main() {
  // This machine's IPv6 path can stall; keep the local sync on IPv4.
  setDefaultResultOrder("ipv4first");
  // Capture stdout in memory. Do not write a token to .env, logs or snapshots.
  const token = (
    await run("gh", ["auth", "token", "--hostname", "github.com"], {
      timeout: 8000,
    })
  ).stdout.trim();
  if (!token) throw new Error("GitHub authentication unavailable");
  const profile = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });
  if (!profile.ok || (await profile.json()).login?.toLowerCase() !== OWNER)
    throw new Error("Wrong GitHub account");

  async function refresh() {
    const now = Date.now();
    const results = await Promise.allSettled([
      (async () => {
        if (activityRetryAt > now) return;
        const full = now - lastFull > 24 * 60 * 60_000;
        try {
          const result = await fetchActivity({
            token,
            previous,
            etag,
            now,
            incremental: !full,
          });
          await writePreviewSnapshot(root, "activity", result.snapshot);
          previous = result.snapshot;
          etag = result.etag;
          if (full) lastFull = now;
        } catch (error) {
          // The API helper provides a safe retry time; no provider text is logged.
          activityRetryAt = Math.max(
            now + 120_000,
            typeof error === "object" &&
              error &&
              "retryAt" in error &&
              typeof error.retryAt === "number"
              ? error.retryAt
              : 0,
          );
          throw error;
        }
      })(),
      (async () => {
        if (reposRetryAt > now) return;
        const repos = await fetchPublicRepos(token, {
          async backoff(until) {
            if (until) reposRetryAt = Math.max(reposRetryAt, until);
            return reposRetryAt;
          },
        });
        await writePreviewSnapshot(root, "repos", {
          repos,
          syncedAt: new Date(now).toISOString(),
        });
      })(),
    ]);
    if (results.some((result) => result.status === "rejected")) {
      if (!initialized) throw new Error("Initial GitHub sync failed");
      console.error(
        "GitHub refresh failed; the last complete local snapshot is retained.",
      );
    } else {
      initialized = true;
      console.log(`GitHub @${OWNER} synced at ${new Date(now).toISOString()}.`);
    }
  }

  await refresh();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORTFOLIO_GITHUB_LOCAL_PREVIEW: `http://localhost:${port}`,
  };
  // The web server reads public snapshots only; the CLI credential stays here.
  delete env.GITHUB_TOKEN;
  delete env.GH_TOKEN;
  delete env.GITHUB_AUTH_TOKEN;
  const server = spawn(
    process.execPath,
    [
      path.join(root, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "localhost",
      "--port",
      String(port),
    ],
    { cwd: root, env, stdio: "inherit" },
  );
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timer = setTimeout(async () => {
      await refresh().catch(() =>
        console.error("GitHub refresh unavailable; local snapshot retained."),
      );
      if (!stopped) schedule();
    }, 120_000);
  };
  schedule();
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    server.kill("SIGTERM");
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  server.once("error", () => {
    stop();
    process.exitCode = 1;
  });
  server.once("exit", (code) => {
    stopped = true;
    clearTimeout(timer);
    process.exitCode = code ?? 0;
  });
}

main().catch(() => {
  console.error(
    `GitHub preview could not start. Check gh auth status for @${OWNER} and run npm run build first.`,
  );
  process.exitCode = 1;
});
