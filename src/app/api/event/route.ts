import { createRedis } from "@/lib/github/redis";
import { eventChannelField, eventField, eventSchema } from "@/lib/events";
import { failureReason } from "@/lib/github/failure";

export const runtime = "nodejs";

const PREFIX = "portfolio:events:v1:";
const CHANNEL_PREFIX = "portfolio:event-channels:v1:";
const MAX_BODY = 512;
// Far above real traffic; it only keeps a flood from filling the store.
const PER_MINUTE = 120;
// The most one counter takes in a day. A script can send the headers a
// browser sends, and nothing here may identify it, so this bounds what a
// flood can add to any one count; real days stay far below it.
const PER_DAY = 1000;
const KEEP_DAYS = 400;
const bots =
  /bot|crawl|spider|slurp|preview|lighthouse|headless|curl|wget|python|httpclient|axios|node-fetch/i;

// One round trip and two ceilings: legacy total and separate channel count.
const COUNT = `local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], 120) end
if n > tonumber(ARGV[1]) then return 0 end
if tonumber(redis.call('HGET', KEYS[2], ARGV[2]) or '0') >= tonumber(ARGV[5]) then return 0 end
redis.call('HINCRBY', KEYS[2], ARGV[2], 1)
redis.call('EXPIRE', KEYS[2], ARGV[3])
redis.call('HINCRBY', KEYS[3], ARGV[4], 1)
redis.call('EXPIRE', KEYS[3], ARGV[3])
return 1`;

const done = (status = 204) => new Response(null, { status });

/**
 * Counts one conversion event (src/lib/events.ts) under the day's key. It
 * stores no address, user agent, cookie or identifier: only how many times
 * each allowed event happened that day. Bots, other sites and anything
 * outside the allowlist are dropped quietly.
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY)
    return done(413);
  // Browsers mark their own beacons, so another site's page cannot count
  // here; a script can copy the header, which the daily ceiling bounds.
  if (request.headers.get("sec-fetch-site") !== "same-origin") return done(403);
  if (
    request.headers.get("sec-gpc") === "1" ||
    request.headers.get("dnt") === "1" ||
    bots.test(request.headers.get("user-agent") ?? "")
  )
    return done();
  const body = await request.text();
  if (body.length > MAX_BODY) return done(413);
  let parsed;
  try {
    parsed = eventSchema.safeParse(JSON.parse(body));
  } catch {
    return done(400);
  }
  if (!parsed.success) return done(400);
  const redis = createRedis();
  if (!redis) return done();
  const now = new Date();
  try {
    await redis(
      "EVAL",
      COUNT,
      3,
      `${PREFIX}minute:${Math.floor(now.getTime() / 60_000)}`,
      `${PREFIX}day:${now.toISOString().slice(0, 10)}`,
      `${CHANNEL_PREFIX}day:${now.toISOString().slice(0, 10)}`,
      PER_MINUTE,
      eventField(parsed.data),
      KEEP_DAYS * 86_400,
      eventChannelField(parsed.data),
      PER_DAY,
    );
  } catch (error) {
    console.error(`Event count failed (${failureReason(error)}).`);
  }
  return done();
}
