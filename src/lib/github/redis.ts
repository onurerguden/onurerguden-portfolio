import "server-only";

/** Deletes a lock only if this worker still owns it (KEYS[1], ARGV[1] nonce). */
export const RELEASE_LOCK =
  "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0";

/**
 * Moves a backoff time (KEYS[1]) forward to ARGV[1], never back, expiring it
 * then; ARGV[2] is now. Both in epoch milliseconds.
 */
export const RAISE_BACKOFF =
  "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if tonumber(ARGV[1])>n then redis.call('SET',KEYS[1],ARGV[1],'PX',math.max(1000,tonumber(ARGV[1])-tonumber(ARGV[2]))) end return 1";

export type RedisCommand = <T>(...args: (string | number)[]) => Promise<T>;

/**
 * Upstash Redis over its REST command API, with explicit timeouts and no
 * Next.js fetch caching. Returns null when the integration is not configured.
 * The Vercel Marketplace integration injects the same credentials as KV_*.
 */
export function createRedis(timeout = 2500): RedisCommand | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return async function command<T>(...args: (string | number)[]) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok)
      throw new Error(`Snapshot storage unavailable: HTTP ${response.status}`);
    const data = (await response.json()) as { result: T; error?: string };
    // Upstash's error text names the failure (a quota, a script error), never
    // the credentials or the stored values.
    if (data.error)
      throw new Error(`Snapshot storage failed: ${data.error.slice(0, 100)}`);
    return data.result;
  };
}
