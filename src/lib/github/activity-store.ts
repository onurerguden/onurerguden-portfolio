import "server-only";
import type { ActivitySnapshot, ActivityStore } from "./activity-core";
import { createRedis } from "./redis";

const PREFIX = "portfolio:github:activity:v1:";
const keys = {
  snapshot: PREFIX + "snapshot",
  fetchedAt: PREFIX + "fetched-at",
  revision: PREFIX + "revision",
  etag: PREFIX + "events-etag",
  lock: PREFIX + "lock",
  cooldown: PREFIX + "cooldown",
  dirty: PREFIX + "dirty",
  backoff: PREFIX + "backoff",
  delivery: PREFIX + "delivery:",
};

// The snapshot is stored as an opaque JSON string: Lua only compares the
// fetch time, so cjson never re-encodes (and never breaks) empty arrays.
const COMMIT = `if tonumber(ARGV[1]) <= tonumber(redis.call('GET', KEYS[2]) or '0') then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[1])
if ARGV[3] ~= '' then redis.call('SET', KEYS[4], ARGV[3]) end
return redis.call('INCR', KEYS[3])`;

export function createActivityStore(timeout = 2500): ActivityStore | null {
  const command = createRedis(timeout);
  if (!command) return null;
  return {
    async read() {
      const [raw, revision, dirty, fetchedAt] = await command<
        (string | null)[]
      >("MGET", keys.snapshot, keys.revision, keys.dirty, keys.fetchedAt);
      return {
        snapshot: raw ? (JSON.parse(raw) as ActivitySnapshot) : null,
        revision: Number(revision ?? 0),
        dirty: dirty === "1",
        fetchedAt: Number(fetchedAt ?? 0),
      };
    },
    async commit(snapshot, fetchedAt, etag) {
      return Number(
        await command(
          "EVAL",
          COMMIT,
          4,
          keys.snapshot,
          keys.fetchedAt,
          keys.revision,
          keys.etag,
          fetchedAt,
          JSON.stringify(snapshot),
          etag ?? "",
        ),
      );
    },
    async etag() {
      return command<string | null>("GET", keys.etag);
    },
    async acquire(nonce) {
      return (await command("SET", keys.lock, nonce, "NX", "EX", 60)) === "OK";
    },
    async release(nonce) {
      await command(
        "EVAL",
        "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",
        1,
        keys.lock,
        nonce,
      );
    },
    async cooldown() {
      return (
        (await command("SET", keys.cooldown, "1", "NX", "PX", 120_000)) === "OK"
      );
    },
    async markDirty() {
      await command("SET", keys.dirty, "1", "EX", 900);
    },
    async claim(delivery) {
      return (
        (await command(
          "SET",
          keys.delivery + delivery,
          "1",
          "NX",
          "EX",
          604800,
        )) === "OK"
      );
    },
    async backoff(until) {
      if (until)
        await command(
          "EVAL",
          "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if tonumber(ARGV[1])>n then redis.call('SET',KEYS[1],ARGV[1],'PX',math.max(1000,tonumber(ARGV[1])-tonumber(ARGV[2]))) end return 1",
          1,
          keys.backoff,
          until,
          Date.now(),
        );
      return Number((await command("GET", keys.backoff)) ?? 0);
    },
  };
}
