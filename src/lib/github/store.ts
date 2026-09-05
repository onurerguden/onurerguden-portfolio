import 'server-only';
import type { Snapshot, SyncStore } from './core';

const PREFIX = 'portfolio:github:v1:';
const EMPTY: Snapshot = { repos: [], syncedAt: null, revision: 0 };
// Use Redis REST directly for explicit request timeouts and no Next fetch caching.
export function createStore(): SyncStore | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  async function command<T>(...args: (string | number)[]): Promise<T> {
    const response = await fetch(url!, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), cache: 'no-store', signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error('Snapshot storage unavailable');
    const data = await response.json() as { result: T; error?: string };
    if (data.error) throw new Error('Snapshot storage failed');
    return data.result;
  }
  const key = PREFIX + 'snapshot';
  return {
    async read() { const raw = await command<string | null>('GET', key); return raw ? JSON.parse(raw) as Snapshot : { ...EMPTY }; },
    async commit(snapshot, revision) {
      const script = "local raw=redis.call('GET',KEYS[1]); local rev=0; if raw then rev=cjson.decode(raw).revision end; if rev~=tonumber(ARGV[1]) then return 0 end; local s=cjson.decode(ARGV[2]); s.revision=rev+1; local encoded=cjson.encode(s); if #s.repos==0 then encoded=string.gsub(encoded,'\"repos\":{}','\"repos\":[]') end; redis.call('SET',KEYS[1],encoded); return 1";
      return await command<number>('EVAL', script, 1, key, revision, JSON.stringify(snapshot)) === 1;
    },
    async remove(id) {
      const script = "local raw=redis.call('GET',KEYS[1]); if not raw then return 1 end; local s=cjson.decode(raw); local repos={}; for _,r in ipairs(s.repos) do if r.id~=tonumber(ARGV[1]) then table.insert(repos,r) end end; s.repos=repos; s.revision=s.revision+1; local encoded=cjson.encode(s); if #repos==0 then encoded=string.gsub(encoded,'\"repos\":{}','\"repos\":[]') end; redis.call('SET',KEYS[1],encoded); return 1";
      await command('EVAL', script, 1, key, id);
    },
    async acquire(delivery, nonce) { return await command('SET', PREFIX + 'lock:' + delivery, nonce, 'NX', 'EX', 90) === 'OK'; },
    async release(delivery, nonce) { await command('EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, PREFIX + 'lock:' + delivery, nonce); },
    async done(delivery) { return !!await command('GET', PREFIX + 'done:' + delivery); },
    async complete(delivery) { await command('SET', PREFIX + 'done:' + delivery, '1', 'EX', 604800); },
    async backoff(until) {
      if (until) await command('EVAL', "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if tonumber(ARGV[1])>n then redis.call('SET',KEYS[1],ARGV[1],'PX',math.max(1000,tonumber(ARGV[1])-tonumber(ARGV[2]))) end return 1", 1, PREFIX + 'backoff', until, Date.now());
      return Number(await command('GET', PREFIX + 'backoff') ?? 0);
    },
  };
}
