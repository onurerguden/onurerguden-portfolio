import { describe, expect, it } from "vitest";
import { z } from "zod";
import { failureReason, missingConfig } from "../src/lib/github/failure";

describe("failure reasons in the function log", () => {
  it("keeps our own message and its HTTP status", () => {
    expect(failureReason(new Error("GitHub request failed: HTTP 401"))).toBe(
      "GitHub request failed: HTTP 401",
    );
    const timeout = new DOMException(
      "The operation timed out.",
      "TimeoutError",
    );
    expect(failureReason(timeout)).toBe(
      "TimeoutError: The operation timed out.",
    );
  });
  it("never echoes a response body", () => {
    const parse = (() => {
      try {
        JSON.parse("<html>secret page</html>");
      } catch (error) {
        return error;
      }
    })();
    expect(failureReason(parse)).toBe("invalid JSON response");
    const shape = z.object({ id: z.number() }).safeParse({ id: "private" });
    expect(failureReason(shape.error)).toBe("unexpected response shape");
    expect(failureReason("text")).toBe("unknown error");
    expect(failureReason(new Error("x".repeat(500)))).toHaveLength(160);
  });
  it("names missing settings without their values", () => {
    expect(
      missingConfig({ CRON_SECRET: "", GITHUB_TOKEN: "token", Redis: null }),
    ).toBe("CRON_SECRET, Redis");
  });
});
