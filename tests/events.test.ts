import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventField, eventSchema } from "../src/lib/events";

const redis = vi.fn();
vi.mock("server-only", () => ({}));
let configured = true;
vi.mock("@/lib/github/redis", () => ({
  createRedis: () => (configured ? redis : null),
}));

const { POST } = await import("../src/app/api/event/route");

const beacon = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://onurerguden.dev/api/event", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (iPhone) Safari/605.1.15",
      ...headers,
    },
  });

beforeEach(() => {
  configured = true;
  redis.mockReset();
  redis.mockImplementation(async () => 1);
});
afterEach(() => vi.restoreAllMocks());

describe("the event allowlist", () => {
  it("accepts the counted events with known values only", () => {
    expect(
      eventSchema.safeParse({ name: "email_click", location: "contact" })
        .success,
    ).toBe(true);
    expect(
      eventSchema.safeParse({ name: "source_click", project: "kuyumcum" })
        .success,
    ).toBe(true);
    for (const event of [
      { name: "email_click", location: "somewhere" },
      { name: "source_click", project: "not-a-project" },
      { name: "language_switch", to: "de" },
      { name: "email_click", location: "contact", visitor: "abc" },
      { name: "page_view" },
    ])
      expect(eventSchema.safeParse(event).success, JSON.stringify(event)).toBe(
        false,
      );
  });
  it("names one counter per event and value", () => {
    expect(eventField({ name: "email_click", location: "contact" })).toBe(
      "email_click:contact",
    );
    expect(eventField({ name: "language_switch", to: "tr" })).toBe(
      "language_switch:tr",
    );
  });
});

describe("POST /api/event", () => {
  it("counts an allowed event under the day's key", async () => {
    const response = await POST(
      beacon({ name: "linkedin_click", location: "footer" }),
    );
    expect(response.status).toBe(204);
    const args = redis.mock.calls[0];
    expect(args[0]).toBe("EVAL");
    expect(args[3]).toMatch(/^portfolio:events:v1:minute:\d+$/);
    expect(args[4]).toMatch(/^portfolio:events:v1:day:\d{4}-\d{2}-\d{2}$/);
    expect(args[6]).toBe("linkedin_click:footer");
    // Nothing about the visitor reaches the store.
    expect(JSON.stringify(args)).not.toMatch(/iPhone|Safari|onurerguden\.dev/);
  });
  it("drops other sites, bots, oversized and unknown events", async () => {
    const event = { name: "email_click", location: "contact" };
    expect(
      (await POST(beacon(event, { "sec-fetch-site": "cross-site" }))).status,
    ).toBe(403);
    expect(
      (await POST(beacon(event, { "user-agent": "Googlebot/2.1" }))).status,
    ).toBe(204);
    expect((await POST(beacon("x".repeat(600)))).status).toBe(413);
    expect((await POST(beacon("{not json"))).status).toBe(400);
    expect(
      (await POST(beacon({ name: "email_click", location: "nowhere" }))).status,
    ).toBe(400);
    expect(redis).not.toHaveBeenCalled();
  });
  it("answers without counting when Redis is not configured", async () => {
    configured = false;
    const response = await POST(
      beacon({ name: "github_click", location: "contact" }),
    );
    expect(response.status).toBe(204);
    expect(redis).not.toHaveBeenCalled();
  });
  it("answers without counting when Redis fails", async () => {
    redis.mockImplementation(async () => {
      throw new Error("Snapshot storage unavailable: HTTP 429");
    });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(
      beacon({ name: "github_click", location: "contact" }),
    );
    expect(response.status).toBe(204);
    expect(errors).toHaveBeenCalledWith(
      "Event count failed (Snapshot storage unavailable: HTTP 429).",
    );
  });
});
