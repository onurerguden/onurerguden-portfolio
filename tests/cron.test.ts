import { describe, expect, it, vi } from "vitest";
import { cronStatus, pingHeartbeat } from "../src/lib/github/cron";

describe("daily reconciliation status", () => {
  it("is ok only when repositories and activity both refreshed", () => {
    expect(cronStatus("updated", "committed")).toBe("ok");
  });
  it("is skipped when work was turned away, not failed", () => {
    // Another worker held a lock, GitHub asked us to back off, or a newer
    // snapshot won the race.
    expect(cronStatus("busy", "committed")).toBe("skipped");
    expect(cronStatus("updated", "skipped")).toBe("skipped");
    expect(cronStatus("updated", "stale")).toBe("skipped");
    expect(cronStatus("updated", "unconfigured")).toBe("skipped");
  });
  it("is failed when either half threw, timeouts included", () => {
    expect(cronStatus("failed", "committed")).toBe("failed");
    expect(cronStatus("updated", "failed")).toBe("failed");
    expect(cronStatus("busy", "failed")).toBe("failed");
  });
});

describe("cron heartbeat", () => {
  it("pings only when a URL is configured", async () => {
    const fetcher = vi.fn(async () => new Response("ok"));
    expect(await pingHeartbeat(undefined, fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await pingHeartbeat("https://hc.example/abc", fetcher)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("swallows failures and never logs the URL", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const url = "https://hc.example/secret-token";
    const down = vi.fn(async () => {
      throw new Error(`connect failed: ${url}`);
    });
    expect(await pingHeartbeat(url, down)).toBe(false);
    const refused = vi.fn(async () => new Response("", { status: 500 }));
    expect(await pingHeartbeat(url, refused)).toBe(false);
    expect(log).toHaveBeenCalledTimes(2);
    for (const call of log.mock.calls)
      expect(call.join(" ")).not.toContain("secret-token");
    log.mockRestore();
  });
});
