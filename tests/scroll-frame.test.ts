import { describe, expect, it, vi } from "vitest";
import { createScrollFrame } from "../src/lib/scroll-frame";

describe("scroll frame", () => {
  it("runs every read before any write, in subscription order", () => {
    const target = new EventTarget();
    const frame = createScrollFrame(() => target);
    const log: string[] = [];
    for (const name of ["journey", "nav", "about"])
      frame.subscribe(() => {
        log.push(`read ${name}`);
        return () => log.push(`write ${name}`);
      });
    frame.subscribe(() => {
      log.push("read only");
    });
    target.dispatchEvent(new Event("scroll"));
    expect(log).toEqual([
      "read journey",
      "read nav",
      "read about",
      "read only",
      "write journey",
      "write nav",
      "write about",
    ]);
  });

  it("listens only while something is subscribed", () => {
    const target = new EventTarget();
    const add = vi.spyOn(target, "addEventListener");
    const remove = vi.spyOn(target, "removeEventListener");
    const frame = createScrollFrame(() => target);
    const read = vi.fn();
    const offA = frame.subscribe(read);
    const offB = frame.subscribe(() => {});
    expect(add).toHaveBeenCalledTimes(1);
    offA();
    target.dispatchEvent(new Event("scroll"));
    expect(read).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    offB();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
