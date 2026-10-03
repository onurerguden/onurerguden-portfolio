import "server-only";
import { connection } from "next/server";
import { createStore } from "./store";
import { localPreviewEnabled, readPreviewRepos } from "./local-preview-core";
export type { RepoSummary } from "./core";
export async function getPublicProjects() {
  try {
    let snapshot;
    if (localPreviewEnabled()) {
      await connection();
      snapshot = await readPreviewRepos(process.cwd());
    } else {
      snapshot = await createStore()?.read();
    }
    return {
      repos: snapshot?.repos ?? [],
      syncedAt: snapshot?.syncedAt ?? null,
    };
  } catch {
    // No browser-visible provider errors, tokens or private payloads.
    return { repos: [], syncedAt: null };
  }
}
