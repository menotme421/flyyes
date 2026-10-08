import { useEffect, useLayoutEffect, useRef, useState } from "react";

// WHY: Pixel-perfect responsive collapse (Word behavior) instead of guessed
// breakpoints. The secondary zone never wraps, so narrowing pushes the
// ribbon's scrollWidth past its clientWidth — that overflow is the collapse
// signal (height comparison can't work: wrapped content grows clientHeight
// equally). Lowest-priority visible group hides into the overflow menu per
// frame until it fits; width growth re-shows. Monotonic while converging,
// so the loop always settles — it can never oscillate. Core keeps wrapping
// as the phone-size fallback (wrapped lines never inflate scrollWidth).

export interface OverflowGroupMeta {
  id: string;
  priority: number;
}

export type ToolbarContext = "default" | "image" | "table" | "link";

/**
 * Which right-zone panel the selection earns. Priority is deliberate:
 * image beats table (an image node selection is never "in" a table for
 * tool purposes), table beats link. Pure so it is unit-testable.
 */
export function resolveToolbarContext(flags: {
  imageSelected: boolean;
  inTable: boolean;
  linkActive: boolean;
}): ToolbarContext {
  if (flags.imageSelected) return "image";
  if (flags.inTable) return "table";
  if (flags.linkActive) return "link";
  return "default";
}

// WHY: Group identity shared by the measurement hook and the panel render —
// one literal per group, so collapse order can never drift from the panel.
export const PANEL_COLLAPSIBLE: Record<ToolbarContext, OverflowGroupMeta[]> = {
  default: [
    { id: "pagebreak", priority: 10 },
    { id: "indents", priority: 15 },
    { id: "textstyle", priority: 20 },
    { id: "search", priority: 60 },
  ],
  image: [
    { id: "sizes", priority: 10 },
    { id: "imagedelete", priority: 50 },
  ],
  table: [
    { id: "tablealign", priority: 10 },
    { id: "borders", priority: 15 },
    { id: "cells", priority: 30 },
    { id: "cols", priority: 40 },
    { id: "rows", priority: 50 },
  ],
  link: [{ id: "removelink", priority: 10 }],
};

/**
 * Lowest-priority visible group id, or null when every collapsible group is
 * already hidden. Ties break by array order (leftmost collapses first).
 * Pure so the collapse order is unit-tested, not eyeballed.
 */
export function nextCollapseId(
  groups: readonly OverflowGroupMeta[],
  hiddenIds: readonly string[]
): string | null {
  let best: OverflowGroupMeta | null = null;
  for (const group of groups) {
    if (hiddenIds.includes(group.id)) continue;
    if (!best || group.priority < best.priority) best = group;
  }
  return best ? best.id : null;
}

/**
 * Tracks ribbon wrapping and collapses groups until the bar fits one row.
 * hiddenIds resets whenever resetKey changes (context swap brings a
 * different toolset — stale ids must never leak across panels). Dropdowns,
 * popovers, and dialogs never collapse (only plain command buttons do), so
 * no floating UI is ever rebuilt inside the menu.
 */
export function useToolbarOverflow(
  element: HTMLElement | null,
  groups: readonly OverflowGroupMeta[],
  resetKey: string
): string[] {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const prevWidth = useRef(0);
  const hiddenRef = useRef<string[]>([]);
  const groupsKey = groups.map((group) => `${group.id}:${group.priority}`).join(",");

  useEffect(() => {
    hiddenRef.current = [];
    setHiddenIds([]);
    prevWidth.current = 0;
  }, [resetKey]);

  // WHY: The chained animation frames share this closure, so `groups` is
  // always current for the effect lifetime (groupsKey re-runs the effect on
  // any change) — no ref mirror needed.
  useLayoutEffect(() => {
    if (!element || groups.length === 0) return;
    let frame = 0;
    let steps = 0;
    let disposed = false;
    // WHY: At most 25 chained frames — collapsing is monotonic (one group per
    // frame) and push/pop settles within 3, so the cap is a backstop only.
    const MAX_STEPS = 25;
    const step = () => {
      if (disposed || steps > MAX_STEPS) return;
      steps += 1;
      const overflowing = element.scrollWidth > element.clientWidth + 1;
      const width = element.clientWidth;
      const previous = hiddenRef.current;
      if (overflowing) {
        const next = nextCollapseId(groups, previous);
        if (!next) return;
        hiddenRef.current = [...previous, next];
        setHiddenIds(hiddenRef.current);
        prevWidth.current = width;
        frame = requestAnimationFrame(step);
        return;
      }
      // WHY: Re-show one group per width growth only — popping without a
      // width change would push/pop the same id on alternate frames.
      if (previous.length > 0 && width > prevWidth.current) {
        hiddenRef.current = previous.slice(0, -1);
        setHiddenIds(hiddenRef.current);
        prevWidth.current = width;
        frame = requestAnimationFrame(step);
      }
    };
    const schedule = () => {
      steps = 0;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    };
    // WHY: The ribbon's own border box never changes when groups hide (it is
    // full-width by construction), so ResizeObserver alone cannot drive the
    // loop — each step chains the next frame until settled, and resizes
    // restart the chain from zero.
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    frame = requestAnimationFrame(schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [element, groupsKey, resetKey]);

  return hiddenIds;
}
