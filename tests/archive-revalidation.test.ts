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
