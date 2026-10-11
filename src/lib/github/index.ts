import "server-only";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { createStore } from "./store";
import { localPreviewEnabled, readPreviewRepos } from "./local-preview-core";
import { failureReason } from "./failure";
export type { RepoSummary } from "./core";
/** Tag of the archive's cached repository list; a sync refreshes it. */
export const reposTag = "github-repos";

// Cached for the built archive page: an uncached Redis read while rendering
// would make the page render on every request instead of coming from the
// CDN. A sync revalidates the tag; the hour is the fallback.
const readRepos = unstable_cache(
  async () => createStore()?.read(),
  [reposTag],
  {
    tags: [reposTag],
    revalidate: 3600,
  },
);

export async function getPublicProjects() {
  try {
    let snapshot;
    if (localPreviewEnabled()) {
      await connection();
      snapshot = await readPreviewRepos(process.cwd());
    } else {
      snapshot = await readRepos();
    }
    return {
      repos: snapshot?.repos ?? [],
      syncedAt: snapshot?.syncedAt ?? null,
    };
  } catch (error) {
    // No browser-visible provider errors, tokens or private payloads.
    console.error(`GitHub archive read failed (${failureReason(error)}).`);
    // A build has no earlier page to keep, so it ships the editorial
    // fallback and the next revalidation fills it in. Later, an error must
    // reach Next.js: it then keeps serving the last good archive instead of
    // publishing an empty one until the hourly revalidation.
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD)
      return { repos: [], syncedAt: null };
    throw error;
  }
}
