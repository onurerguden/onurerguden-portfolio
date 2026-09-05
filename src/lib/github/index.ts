import "server-only";
import { createStore } from "./store";
export type { RepoSummary } from "./core";
export async function getPublicProjects() {
  try {
    const snapshot = await createStore()?.read();
    return {
      repos: snapshot?.repos ?? [],
      syncedAt: snapshot?.syncedAt ?? null,
    };
  } catch {
    // No browser-visible provider errors, tokens or private payloads.
    return { repos: [], syncedAt: null };
  }
}
