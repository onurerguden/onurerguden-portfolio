import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { parseSnapshot } from "../activity-view";
import { OWNER, type Snapshot } from "./core";

/** Explicit loopback opt-in; Vercel deployments always use Redis. */
export function localPreviewEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (env.VERCEL || !env.PORTFOLIO_GITHUB_LOCAL_PREVIEW) return false;
  try {
    const url = new URL(env.PORTFOLIO_GITHUB_LOCAL_PREVIEW);
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

type Kind = "activity" | "repos";
const directory = (root: string) => path.join(root, "work", "github");

/** Only filtered public snapshots live here, never credentials or raw API bodies. */
export async function writePreviewSnapshot(
  root: string,
  kind: Kind,
  snapshot: unknown,
) {
  const dir = directory(root);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `${kind}.json`);
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot), { mode: 0o600 });
  // A reader sees either complete version, never a half-written JSON file.
  await rename(temporary, target);
}

export async function readPreviewActivity(root: string) {
  try {
    const raw = await readFile(
      path.join(directory(root), "activity.json"),
      "utf8",
    );
    return parseSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

const reposSchema = z.object({
  syncedAt: z.iso.datetime(),
  repos: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1),
      url: z.string(),
      description: z.string().nullable(),
      language: z.string().nullable(),
      pushedAt: z.string().nullable(),
      fork: z.boolean(),
      archived: z.boolean(),
    }),
  ),
});

export async function readPreviewRepos(
  root: string,
): Promise<Omit<Snapshot, "revision"> | null> {
  try {
    const raw = await readFile(
      path.join(directory(root), "repos.json"),
      "utf8",
    );
    const snapshot = reposSchema.parse(JSON.parse(raw));
    if (
      snapshot.repos.some(
        (repo) =>
          repo.url !==
          `https://github.com/${OWNER}/${encodeURIComponent(repo.name)}`,
      )
    )
      return null;
    return snapshot;
  } catch {
    return null;
  }
}
