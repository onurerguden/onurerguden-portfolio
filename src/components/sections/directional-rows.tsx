"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A list whose rows (`[data-row]`) record the side a pointer entered from and
 * left through, so the hover fill can flow in from that edge and retreat
 * through the other. Touch has no hover, so it is ignored.
 */
export default function DirectionalRows({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const node = list.current;
    if (!node) return;
    const rowOf = (event: PointerEvent) => {
      if (event.pointerType === "touch") return null;
      const row =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-row]")
          : null;
      const other = event.relatedTarget;
      // Moving between children of one row is not entering or leaving it.
      if (!row || (other instanceof Node && row.contains(other))) return null;
      return row;
    };
    const side = (row: HTMLElement, y: number) => {
      const rect = row.getBoundingClientRect();
      return y < rect.top + rect.height / 2 ? "top" : "bottom";
    };
    const over = (event: PointerEvent) => {
      const row = rowOf(event);
      if (!row) return;
      row.dataset.enter = side(row, event.clientY);
      delete row.dataset.exit;
    };
    const out = (event: PointerEvent) => {
      const row = rowOf(event);
      if (!row) return;
      row.dataset.exit = side(row, event.clientY);
      delete row.dataset.enter;
    };
    node.addEventListener("pointerover", over);
    node.addEventListener("pointerout", out);
    return () => {
      node.removeEventListener("pointerover", over);
      node.removeEventListener("pointerout", out);
    };
  }, []);
  return (
    <ol ref={list} className={className}>
      {children}
    </ol>
  );
}
