import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createRedis } = await import("../src/lib/github/redis");

const names = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function captureRequest() {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify({ result: "PONG" })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("createRedis", () => {
  it("is disabled without credentials", () => {
    for (const name of names) vi.stubEnv(name, "");
    expect(createRedis()).toBeNull();
  });

  it("accepts the Vercel Marketplace KV names", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    const fetchMock = captureRequest();
    await expect(createRedis()!("PING")).resolves.toBe("PONG");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://kv.example");
    expect(init.headers).toMatchObject({ Authorization: "Bearer kv-token" });
  });

  it("prefers the explicit Upstash names", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    const fetchMock = captureRequest();
    await createRedis()!("PING");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://upstash.example");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer upstash-token",
    });
  });
});
