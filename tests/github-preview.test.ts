import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  localPreviewEnabled,
  readPreviewActivity,
  readPreviewRepos,
  writePreviewSnapshot,
} from "../src/lib/github/local-preview-core";

const roots: string[] = [];
async function temporaryRoot() {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "portfolio-github-preview-"),
  );
  roots.push(root);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("local GitHub preview", () => {
  it.each([
    "http://localhost:3103",
    "http://127.0.0.1:3103",
    "http://[::1]:3103",
  ])("allows explicit loopback origin %s", (origin) =>
    expect(
      localPreviewEnabled({ PORTFOLIO_GITHUB_LOCAL_PREVIEW: origin }),
    ).toBe(true),
  );
  it.each([
    undefined,
    "1",
    "https://localhost:3103",
    "http://example.com",
    "http://localhost.evil.test",
    "http://user:password@localhost",
    "http://localhost/path",
    "http://localhost?key=value",
    "http://localhost#activity",
  ])("rejects missing or non-loopback configuration %s", (origin) =>
    expect(
      localPreviewEnabled({ PORTFOLIO_GITHUB_LOCAL_PREVIEW: origin }),
    ).toBe(false),
  );
  it("never enables on Vercel", () => {
    expect(
      localPreviewEnabled({
        VERCEL: "1",
        PORTFOLIO_GITHUB_LOCAL_PREVIEW: "http://localhost:3103",
      }),
    ).toBe(false);
  });
  it("fails closed for absent and damaged snapshots", async () => {
    const root = await temporaryRoot();
    expect(await readPreviewActivity(root)).toBeNull();
    expect(await readPreviewRepos(root)).toBeNull();
    await writePreviewSnapshot(root, "activity", { version: 2 });
    expect(await readPreviewActivity(root)).toBeNull();
    await writeFile(
      path.join(root, "work/github/activity.json"),
      "half a JSON file",
    );
    expect(await readPreviewActivity(root)).toBeNull();
  });
  it("reads the latest complete activity version after an atomic replacement", async () => {
    const root = await temporaryRoot();
    const year = { year: 2026, start: "2026-10-04", days: [3], total: 3 };
    const snapshot = {
      version: 1,
      syncedAt: "2026-10-04T10:00:00.000Z",
      rolling: {
        ...year,
        commits: 3,
        pullRequests: 0,
        reviews: 0,
        issues: 0,
        restricted: 0,
      },
      years: [year],
      allTime: 3,
      streaks: { current: 1, longest: 1, longestEnd: "2026-10-04" },
      busiestWeekday: 0,
      languages: [],
      events: [],
    };
    await writePreviewSnapshot(root, "activity", snapshot);
    expect(await readPreviewActivity(root)).toEqual(snapshot);
    const newer = { ...snapshot, syncedAt: "2026-10-04T10:02:00.000Z" };
    await writePreviewSnapshot(root, "activity", newer);
    expect(await readPreviewActivity(root)).toEqual(newer);
    expect(
      JSON.parse(
        await readFile(path.join(root, "work/github/activity.json"), "utf8"),
      ),
    ).toEqual(newer);
  });
  it("accepts only owned GitHub repository links and known public fields", async () => {
    const root = await temporaryRoot();
    const repo = {
      id: 1,
      name: "portfolio",
      url: "https://github.com/onurerguden/portfolio",
      description: null,
      language: "TypeScript",
      pushedAt: null,
      fork: false,
      archived: false,
    };
    const snapshot = { repos: [repo], syncedAt: "2026-10-04T10:00:00.000Z" };
    await writePreviewSnapshot(root, "repos", {
      ...snapshot,
      token: "unexpected",
      repos: [{ ...repo, secret: "unexpected" }],
    });
    expect(await readPreviewRepos(root)).toEqual(snapshot);
    await writePreviewSnapshot(root, "repos", {
      ...snapshot,
      repos: [{ ...repo, url: "https://example.com" }],
    });
    expect(await readPreviewRepos(root)).toBeNull();
  });
});
