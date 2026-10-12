import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyEventChannel } from "../src/lib/event-channels";
import { eventReportKey, eventReportOptions } from "../scripts/event-report";

const entry = "https://onurerguden.dev/en";
const classify = (referrer: string, query = "") =>
  classifyEventChannel({ url: `${entry}${query}`, referrer });

describe("coarse entry channel classification", () => {
  it.each([
    ["https://chatgpt.com/c/private?text=secret", "chatgpt"],
    ["https://chat.openai.com/", "chatgpt"],
    ["https://claude.ai/", "claude"],
    ["https://www.perplexity.ai/", "perplexity"],
    ["https://perplexity.com/", "perplexity"],
    ["https://www.google.com/search?q=private", "google"],
    ["https://www.google.com.tr/search?q=private", "google"],
    ["https://www.bing.com/search?q=private", "bing"],
    ["https://copilot.microsoft.com/", "bing"],
  ])("recognizes external %s", (referrer, channel) => {
    expect(classify(referrer)).toBe(channel);
  });
  it("prefers a recognized referrer to campaign attribution", () => {
    expect(classify("https://claude.ai/", "?utm_source=chatgpt.com")).toBe(
      "claude",
    );
  });
  it("uses only allowlisted campaign sources before fallback categories", () => {
    expect(classify("", "?utm_source=CHATGPT.COM")).toBe("chatgpt");
    expect(classify("https://other.test/", "?utm_source=perplexity")).toBe(
      "perplexity",
    );
    expect(classify("https://onurerguden.dev/tr", "?utm_source=bing")).toBe(
      "bing",
    );
    expect(classify("https://other.test/", "?utm_source=secret-name")).toBe(
      "other_referral",
    );
    expect(classify("", "?utm_source=secret-name")).toBe("direct_or_unknown");
  });
  it.each([
    "https://chatgpt.com.evil.test/",
    "https://evilchatgpt.com/",
    "https://claude.ai.evil.test/",
    "https://google.evil.test/",
    "https://chatgpt.com@evil.test/",
  ])("does not trust a lookalike host %s", (referrer) => {
    expect(classify(referrer)).toBe("other_referral");
  });
  it.each([
    "__proto__",
    "constructor",
    "chatgpt.com.evil",
    "https://chatgpt.com",
  ])("discards an unknown campaign value %s", (value) =>
    expect(classify("", `?utm_source=${value}`)).toBe("direct_or_unknown"),
  );
  it("distinguishes same-origin navigation, external referrals and unknown entry", () => {
    expect(classify("https://onurerguden.dev/tr/projects/kuyumcum")).toBe(
      "internal",
    );
    expect(classify("https://www.onurerguden.dev/en")).toBe("other_referral");
    expect(classify("https://other.test/")).toBe("other_referral");
    for (const referrer of ["", "not a URL", "javascript:alert(1)"])
      expect(classify(referrer)).toBe("direct_or_unknown");
    expect(
      classifyEventChannel({
        url: "not a URL",
        referrer: "https://chatgpt.com",
      }),
    ).toBe("direct_or_unknown");
  });
});

describe("entry capture and one anonymous conversion beacon", () => {
  let location: { href: string };
  let navigator: {
    sendBeacon: ReturnType<typeof vi.fn>;
    doNotTrack: string;
    globalPrivacyControl: boolean;
  };
  beforeEach(() => {
    vi.resetModules();
    location = { href: `${entry}?utm_source=chatgpt.com&private=do-not-send` };
    navigator = {
      sendBeacon: vi.fn(),
      doNotTrack: "0",
      globalPrivacyControl: false,
    };
    vi.stubGlobal("window", { location });
    vi.stubGlobal("document", { referrer: "" });
    vi.stubGlobal("navigator", navigator);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("captures before the delayed beacon import and preserves it through client navigation", async () => {
    // SiteEvents eagerly imports this lightweight module before any interaction.
    await import("../src/lib/event-entry");
    location.href =
      "https://onurerguden.dev/tr/projects/kuyumcum?utm_source=bing";
    const { track } = await import("../src/lib/event-beacon");
    track({ name: "email_copy", location: "contact" });
    expect(navigator.sendBeacon).toHaveBeenCalledExactlyOnceWith(
      "/api/event",
      JSON.stringify({
        name: "email_copy",
        location: "contact",
        channel: "chatgpt",
      }),
    );
    const payload = navigator.sendBeacon.mock.calls[0][1];
    expect(payload).not.toMatch(/private|https:|utm_|kuyumcum|bing/);
  });
  it("a new document can be internal rather than first-touch attributed", async () => {
    location.href = "https://onurerguden.dev/tr";
    vi.stubGlobal("document", { referrer: entry });
    const { track } = await import("../src/lib/event-beacon");
    track({ name: "email_copy", location: "contact" });
    expect(JSON.parse(navigator.sendBeacon.mock.calls[0][1]).channel).toBe(
      "internal",
    );
  });
  it("uses the initial navigation when history changed before the module loaded", async () => {
    location.href = `${entry}?utm_source=bing`;
    vi.stubGlobal("window", {
      location,
      performance: {
        getEntriesByType: () => [
          { name: `${entry}?utm_source=chatgpt.com&private=do-not-send` },
        ],
      },
    });
    const { track } = await import("../src/lib/event-beacon");
    track({ name: "email_copy", location: "contact" });
    expect(navigator.sendBeacon).toHaveBeenCalledExactlyOnceWith(
      "/api/event",
      JSON.stringify({
        name: "email_copy",
        location: "contact",
        channel: "chatgpt",
      }),
    );
  });
  it.each(["globalPrivacyControl", "doNotTrack"] as const)(
    "sends no early copy event with %s",
    async (signal) => {
      if (signal === "doNotTrack") navigator.doNotTrack = "1";
      else navigator.globalPrivacyControl = true;
      const { track } = await import("../src/lib/event-beacon");
      track({ name: "email_copy", location: "contact" });
      expect(navigator.sendBeacon).not.toHaveBeenCalled();
    },
  );
  it("rechecks opt-out after module capture", async () => {
    const { track } = await import("../src/lib/event-beacon");
    navigator.globalPrivacyControl = true;
    track({ name: "email_click", location: "contact" });
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });
});

describe("conversion report compatibility", () => {
  it("reads only legacy totals by default and channels only on request", () => {
    expect(eventReportOptions([], "2026-10")).toEqual({
      month: "2026-10",
      channels: false,
    });
    expect(eventReportOptions(["2026-09", "--channels"], "2026-10")).toEqual({
      month: "2026-09",
      channels: true,
    });
    expect(eventReportKey("2026-10-12", false)).toBe(
      "portfolio:events:v1:day:2026-10-12",
    );
    expect(eventReportKey("2026-10-12", true)).toBe(
      "portfolio:event-channels:v1:day:2026-10-12",
    );
  });
  it.each([["2026-00"], ["2026-13"], ["--unknown"], ["2026-10", "2026-11"]])(
    "rejects invalid report arguments %j",
    (...args) =>
      expect(() => eventReportOptions(args, "2026-10")).toThrow("Usage:"),
  );
});
