import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
const synchronize = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("@/lib/github/core", () => ({
  synchronize: (...args: unknown[]) => synchronize(...args),
}));
vi.mock("@/lib/github/store", () => ({ createStore: () => ({}) }));
vi.mock("@/lib/github/activity-store", () => ({
  createActivityStore: () => null,
}));
vi.mock("@/lib/github/activity-core", () => ({ refreshActivity: vi.fn() }));
vi.mock("@/lib/github/cron", () => ({
  cronStatus: () => "ok",
  pingHeartbeat: vi.fn(),
}));

const request = () =>
  new Request("https://example.test/api/cron/github", {
    headers: { authorization: "Bearer secret" },
  });

describe("the built archive page", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "secret");
    vi.stubEnv("GITHUB_TOKEN", "token");
    revalidateTag.mockReset();
    synchronize.mockReset();
  });
  it("refreshes after the daily sync changes the repositories", async () => {
    synchronize.mockResolvedValue("updated");
    const { GET } = await import("../src/app/api/cron/github/route");
    await GET(request());
    expect(revalidateTag).toHaveBeenCalledWith("github-repos", "max");
  });
  it("stays as built when nothing changed", async () => {
    synchronize.mockResolvedValue("duplicate");
    const { GET } = await import("../src/app/api/cron/github/route");
    await GET(request());
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("the daily reconciliation's log", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "secret");
    vi.stubEnv("GITHUB_TOKEN", "github_pat_secret");
    synchronize.mockReset();
  });
  it("names the failed step and status, never the token", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    synchronize.mockRejectedValue(new Error("GitHub request failed: HTTP 401"));
    const { GET } = await import("../src/app/api/cron/github/route");
    await GET(request());
    const lines = errors.mock.calls.map(([line]) => String(line));
    expect(lines).toContain(
      "GitHub reconciliation failed (GitHub request failed: HTTP 401); prior snapshot retained.",
    );
    expect(lines.join("\n")).not.toContain("github_pat_secret");
    errors.mockRestore();
  });
  it("says when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("../src/app/api/cron/github/route");
    expect((await GET(request())).status).toBe(401);
    expect(errors).toHaveBeenCalledWith(
      "GitHub reconciliation refused: CRON_SECRET is not set.",
    );
    errors.mockRestore();
  });
});
