import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { fetchPublicRepos, parseEvent, synchronize, verifySignature, type Snapshot, type SyncStore } from '../src/lib/github/core';

function memoryStore(): SyncStore {
  let snapshot: Snapshot = { repos: [], syncedAt: null, revision: 0 };
  let backoff = 0;
  const locks = new Map<string, string>();
  const done = new Set<string>();
  return {
    read: async () => structuredClone(snapshot),
    commit: async (next, revision) => { if (revision !== snapshot.revision) return false; snapshot = { ...next, revision: revision + 1 }; return true; },
    remove: async id => { snapshot = { ...snapshot, repos: snapshot.repos.filter(repo => repo.id !== id), revision: snapshot.revision + 1 }; },
    acquire: async (id, nonce) => { if (locks.has(id)) return false; locks.set(id, nonce); return true; },
    release: async (id, nonce) => { if (locks.get(id) === nonce) locks.delete(id); },
    done: async id => done.has(id), complete: async id => { done.add(id); },
    backoff: async until => { if (until) backoff = until; return backoff; },
  };
}
const repo = (id = 1, name = 'example') => ({ id, name, html_url: `https://github.com/onurerguden/${name}`, description: 'A project', language: 'TypeScript', pushed_at: '2026-09-01T00:00:00Z', fork: false, archived: false, private: false, owner: { login: 'onurerguden' } });
const response = (repos: unknown[]) => new Response(JSON.stringify(repos));

describe('GitHub webhook trust boundary', () => {
  it('validates raw signatures and rejects tampering / malformed signatures', () => {
    const body = '{"hello":"dünya"}';
    const signature = `sha256=${createHmac('sha256', 'test').update(body).digest('hex')}`;
    expect(verifySignature(body, signature, 'test')).toBe(true);
    expect(verifySignature(body + ' ', signature, 'test')).toBe(false);
    expect(verifySignature(body, 'sha256=xxx', 'test')).toBe(false);
    expect(verifySignature(body, null, 'test')).toBe(false);
  });
  it('rejects unrelated owners and distinguishes deletion from push updates', () => {
    expect(() => parseEvent(JSON.stringify({ repository: { ...repo(), owner: { login: 'other' } } }))).toThrow();
    expect(parseEvent(JSON.stringify({ action: 'deleted', repository: repo() })).remove).toBe(true);
    expect(parseEvent(JSON.stringify({ repository: { ...repo(), private: true } })).remove).toBe(true);
    expect(parseEvent(JSON.stringify({ repository: repo() })).remove).toBe(false);
  });
});
describe('durable synchronization', () => {
  it('filters private, foreign, and profile repositories without losing forks', async () => {
    const store = memoryStore();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([repo(), { ...repo(2), private: true }, { ...repo(3), owner: { login: 'other' } }, repo(4, 'onurerguden'), { ...repo(5, 'fork'), fork: true }]));
    const result = await fetchPublicRepos('token', store, fetcher);
    expect(result.map(item => item.id)).toEqual([1, 5]);
    expect(result[1].fork).toBe(true);
  });
  it('marks only successful deliveries done and ignores repeat deliveries', async () => {
    const store = memoryStore();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([repo()]));
    expect(await synchronize(store, 'token', 'one', fetcher)).toBe('updated');
    expect(await synchronize(store, 'token', 'one', fetcher)).toBe('duplicate');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('blocks concurrent processing of the same delivery', async () => {
    const store = memoryStore();
    let signalStarted!: () => void;
    let resolveFetch!: (value: Response) => void;
    const started = new Promise<void>(resolve => { signalStarted = resolve; });
    const pending = new Promise<Response>(resolve => { resolveFetch = resolve; });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => { signalStarted(); return pending; });
    const first = synchronize(store, 'token', 'simultaneous', fetcher);
    await started;
    expect(await synchronize(store, 'token', 'simultaneous', fetcher)).toBe('busy');
    resolveFetch(response([repo()]));
    expect(await first).toBe('updated');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not restore a deleted ID from an eventually consistent GitHub response', async () => {
    const store = memoryStore();
    await synchronize(store, 'token', 'removed', vi.fn<typeof fetch>().mockResolvedValue(response([repo()])), 1);
    expect((await store.read()).repos).toEqual([]);
  });
  it('preserves the snapshot and allows a failed delivery to be retried', async () => {
    const store = memoryStore();
    await synchronize(store, 'token', 'seed', vi.fn<typeof fetch>().mockResolvedValue(response([repo()])));
    const before = await store.read();
    await expect(synchronize(store, 'token', 'retry', vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')))).rejects.toThrow();
    expect(await store.read()).toEqual(before);
    expect(await store.done('retry')).toBe(false);
    await synchronize(store, 'token', 'retry', vi.fn<typeof fetch>().mockResolvedValue(response([repo(1, 'renamed')])));
    expect((await store.read()).repos[0].name).toBe('renamed');
  });
  it('never commits a partial paginated result', async () => {
    const store = memoryStore();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response(Array.from({ length: 100 }, (_, index) => repo(index + 1, `repo-${index}`)))).mockResolvedValueOnce(new Response('', { status: 500 }));
    await expect(synchronize(store, 'token', 'partial', fetcher)).rejects.toThrow();
    expect((await store.read()).syncedAt).toBeNull();
  });
  it('follows every page and reconciles deletion after a complete read', async () => {
    const store = memoryStore();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response(Array.from({ length: 100 }, (_, index) => repo(index + 1, `repo-${index}`)))).mockResolvedValueOnce(response([repo(101, 'last')]));
    await synchronize(store, 'token', 'pages', fetcher);
    expect((await store.read()).repos).toHaveLength(101);
    await synchronize(store, 'token', 'delete', vi.fn<typeof fetch>().mockResolvedValue(response([])));
    expect((await store.read()).repos).toEqual([]);
  });
  it('persists rate-limit backoff without making another request', async () => {
    const store = memoryStore();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': '120' } }));
    await expect(synchronize(store, 'token', 'limit', fetcher)).rejects.toThrow();
    await expect(synchronize(store, 'token', 'limit', fetcher)).rejects.toThrow('backoff');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('a confirmed removal cannot be overwritten by an in-flight stale fetch', async () => {
    const store = memoryStore();
    await synchronize(store, 'token', 'seed', vi.fn<typeof fetch>().mockResolvedValue(response([repo()])));
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => { await store.remove(1); return response([repo()]); });
    await expect(synchronize(store, 'token', 'stale', fetcher)).rejects.toThrow('Snapshot changed');
    expect((await store.read()).repos).toEqual([]);
  });
});
