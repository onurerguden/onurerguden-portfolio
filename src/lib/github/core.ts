import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const OWNER = 'onurerguden';
export type RepoSummary = { id: number; name: string; url: string; description: string | null; language: string | null; pushedAt: string | null; fork: boolean; archived: boolean };
export type Snapshot = { repos: RepoSummary[]; syncedAt: string | null; revision: number };
export interface SyncStore {
  read(): Promise<Snapshot>;
  commit(snapshot: Omit<Snapshot, 'revision'>, revision: number): Promise<boolean>;
  remove(id: number): Promise<void>;
  acquire(delivery: string, nonce: string): Promise<boolean>;
  release(delivery: string, nonce: string): Promise<void>;
  done(delivery: string): Promise<boolean>;
  complete(delivery: string): Promise<void>;
  backoff(until?: number): Promise<number>;
}
export const repoSchema = z.object({
  id: z.number().int().positive(), name: z.string().min(1), html_url: z.string().url(),
  description: z.string().nullable(), language: z.string().nullable(), pushed_at: z.string().nullable(),
  fork: z.boolean(), archived: z.boolean(), private: z.boolean(), owner: z.object({ login: z.string() }),
});
export function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'));
}
const eventSchema = z.object({ action: z.string().optional(), repository: z.object({ id: z.number().int().positive(), private: z.boolean(), owner: z.object({ login: z.string().optional(), name: z.string().optional() }) }) });
export function parseEvent(body: string): { id: number; remove: boolean } {
  const event = eventSchema.parse(JSON.parse(body));
  const owner = event.repository.owner.login ?? event.repository.owner.name;
  if (owner?.toLowerCase() !== OWNER) throw new Error('Unexpected owner');
  return { id: event.repository.id, remove: event.repository.private || event.action === 'deleted' || event.action === 'privatized' || event.action === 'transferred' };
}
export async function fetchPublicRepos(token: string, store: SyncStore, fetcher: typeof fetch = fetch): Promise<RepoSummary[]> {
  if (!token) throw new Error('GitHub configuration unavailable');
  if (await store.backoff() > Date.now()) throw new Error('GitHub backoff active');
  const repos = new Map<number, RepoSummary>();
  const deadline = Date.now() + 35_000;
  // A failed or incomplete page must never replace the last complete snapshot.
  for (let page = 1; page <= 100; page++) {
    if (Date.now() > deadline) throw new Error('GitHub pagination deadline');
    const response = await fetcher(`https://api.github.com/users/${OWNER}/repos?type=owner&sort=full_name&per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(Math.min(6000, Math.max(1, deadline - Date.now()))),
    });
    if (response.status === 429 || response.status === 403) {
      const retry = Number(response.headers.get('retry-after'));
      const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
      await store.backoff(Math.max(Date.now() + (Number.isFinite(retry) && retry > 0 ? retry * 1000 : 60_000), Number.isFinite(reset) ? reset : 0));
      throw new Error('GitHub rate limited');
    }
    if (!response.ok) throw new Error('GitHub request failed');
    const batch = z.array(repoSchema).parse(await response.json());
    for (const repo of batch) {
      if (repo.private || repo.owner.login.toLowerCase() !== OWNER || repo.name.toLowerCase() === OWNER) continue;
      // Construct the URL from known host and validated ownership, never API-provided URLs.
      repos.set(repo.id, { id: repo.id, name: repo.name, url: `https://github.com/${OWNER}/${encodeURIComponent(repo.name)}`, description: repo.description, language: repo.language, pushedAt: repo.pushed_at, fork: repo.fork, archived: repo.archived });
    }
    if (batch.length < 100) return [...repos.values()].sort((a, b) => (b.pushedAt ?? '').localeCompare(a.pushedAt ?? '') || a.name.localeCompare(b.name));
  }
  throw new Error('GitHub pagination limit');
}
export async function synchronize(store: SyncStore, token: string, delivery: string, fetcher: typeof fetch = fetch, removedId?: number): Promise<'updated' | 'duplicate' | 'busy'> {
  if (await store.done(delivery)) return 'duplicate';
  const nonce = crypto.randomUUID();
  if (!await store.acquire(delivery, nonce)) return 'busy';
  try {
    if (await store.done(delivery)) return 'duplicate';
    const before = await store.read();
    const repos = (await fetchPublicRepos(token, store, fetcher)).filter(repo => repo.id !== removedId);
    if (!await store.commit({ repos, syncedAt: new Date().toISOString() }, before.revision)) throw new Error('Snapshot changed; retry delivery');
    await store.complete(delivery);
    return 'updated';
  } finally { await store.release(delivery, nonce); }
}
