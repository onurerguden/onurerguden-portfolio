import "server-only";

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
    if (!response.ok) throw new Error("Snapshot storage unavailable");
    const data = (await response.json()) as { result: T; error?: string };
    if (data.error) throw new Error("Snapshot storage failed");
    return data.result;
  };
}
