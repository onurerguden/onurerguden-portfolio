import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repoStore = vi.fn();
const activityStore = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("@/lib/github/store", () => ({ createStore: () => repoStore() }));
vi.mock("@/lib/github/activity-store", () => ({
  createActivityStore: () => activityStore(),
}));

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
  repoStore.mockReset();
  activityStore.mockReset();
});
afterEach(() => {
  errors.mockRestore();
  vi.unstubAllEnvs();
});

describe("GET /api/github/health", () => {
  it("is unavailable without Redis", async () => {
    repoStore.mockReturnValue(null);
    activityStore.mockReturnValue(null);
    const { GET } = await import("../src/app/api/github/health/route");
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("returns only the two sync times, briefly cached", async () => {
    repoStore.mockReturnValue({
      read: async () => ({
        repos: [{ id: 1 }],
        syncedAt: "2026-10-11T03:00:05.000Z",
        revision: 9,
      }),
    });
    activityStore.mockReturnValue({
      read: async () => ({
        snapshot: { syncedAt: "2026-10-11T03:00:09.000Z", years: [] },
        revision: 4,
        dirty: false,
        fetchedAt: 0,
      }),
    });
    const { GET } = await import("../src/app/api/github/health/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=300");
    expect(await response.json()).toEqual({
      reposSyncedAt: "2026-10-11T03:00:05.000Z",
      activitySyncedAt: "2026-10-11T03:00:09.000Z",
    });
  });
  it("fails closed and logs the reason when Redis errors", async () => {
    repoStore.mockReturnValue({
      read: async () => {
        throw new Error("Snapshot storage unavailable: HTTP 401");
      },
    });
    activityStore.mockReturnValue({ read: async () => ({ snapshot: null }) });
    const { GET } = await import("../src/app/api/github/health/route");
    const response = await GET();
    expect(response.status).toBe(503);
    expect(errors).toHaveBeenCalledWith(
      expect.stringContaining("Snapshot storage unavailable: HTTP 401"),
    );
  });
});
