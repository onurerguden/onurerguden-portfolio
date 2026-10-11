import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repoStore = vi.fn();
const readRepos = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("@/lib/github/store", () => ({ createStore: () => repoStore() }));

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
  repoStore.mockReset();
  readRepos.mockReset();
});
afterEach(() => {
  errors.mockRestore();
  vi.unstubAllEnvs();
});

describe("the archive read", () => {
  beforeEach(() => repoStore.mockReturnValue({ read: readRepos }));
  it("rethrows at runtime so Next.js keeps the last good page", async () => {
    readRepos.mockRejectedValue(new Error("Snapshot storage unavailable"));
    const { getPublicProjects } = await import("../src/lib/github");
    await expect(getPublicProjects()).rejects.toThrow("storage unavailable");
  });
  it("ships the editorial fallback during a build", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    readRepos.mockRejectedValue(new Error("Snapshot storage unavailable"));
    const { getPublicProjects } = await import("../src/lib/github");
    await expect(getPublicProjects()).resolves.toEqual({
      repos: [],
      syncedAt: null,
    });
  });
  it("stays empty, without an error, when Redis is not configured", async () => {
    repoStore.mockReturnValue(null);
    const { getPublicProjects } = await import("../src/lib/github");
    await expect(getPublicProjects()).resolves.toEqual({
      repos: [],
      syncedAt: null,
    });
  });
});
