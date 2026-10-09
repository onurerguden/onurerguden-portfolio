import { describe, expect, it } from "vitest";
import { qa, qaRequested } from "../src/lib/qa";

describe("QA attributes", () => {
  it("are written only when a test or the address asks for them", () => {
    expect(qaRequested(null, "")).toBe(false);
    expect(qaRequested("0", "?story=raw")).toBe(false);
    expect(qaRequested("1", "")).toBe(true);
    expect(qaRequested(null, "?qa")).toBe(true);
    expect(qaRequested(null, "?story=raw&qa=1")).toBe(true);
  });
  it("stay off where there is no page", () => {
    expect(qa()).toBe(false);
  });
});
