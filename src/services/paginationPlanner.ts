// WHY: Single pagination engine for edit gaps (measured px) and preview sheets
// (estimated px) — same policy, same geometry, so both views agree. Pure and
// unit-tested; callers supply blocks, never DOM.

/** A4 sheet height at 96dpi. Width lives here too so all views share it. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

export interface PaginatableBlock {
  /** Offset within the content flow (measured px or estimated px — consistent per call). */
  top: number;
  /** Block extent in the same units as top. */
  height: number;
  /** Manual break marker — the NEXT block opens a fresh page. */
  forceBreakAfter: boolean;
}

/**
 * Greedy block-push pagination: returns indices AFTER which a break renders.
 * - Never breaks before the first block or after the last.
 * - A block whose BOTTOM would overflow the page is pushed whole to the next
 *   page (page bottom stays blank — accepted for V1, like Docs/Word block flow).
 * - Oversized blocks (taller than a page) are never split: they open a fresh
 *   page when not first on the page and overflow it; following content flows
 *   on after them.
 * - A forced break opens the next block on a fresh page.
 */
export function planPageBreaks(
  blocks: ReadonlyArray<PaginatableBlock>,
  pageContentHeightPx: number
): number[] {
  return planPageBreaksWithFiller(blocks, pageContentHeightPx).map((plan) => plan.afterIndex);
}

/** One visual page break: filler (white, px) fills the current page to its bottom. */
export interface PageBreakPlan {
  /** Index AFTER which the spacer renders (next block opens a fresh page). */
  afterIndex: number;
  /** Blank white px left on the current page — spacer filler height. */
  fillerHeightPx: number;
}

export function planPageBreaksWithFiller(
  blocks: ReadonlyArray<PaginatableBlock>,
  pageContentHeightPx: number
): PageBreakPlan[] {
  const breaks: PageBreakPlan[] = [];
  if (blocks.length === 0 || !(pageContentHeightPx > 0)) return breaks;

  let pageTop = blocks[0].top;
  let pendingBreak = false;

  blocks.forEach((block, index) => {
    if (index > 0) {
      const startsNewPage = block.top > pageTop;
      const overflows = block.top + block.height - pageTop > pageContentHeightPx;
      if (pendingBreak || (startsNewPage && overflows)) {
        const rest = pageContentHeightPx - (block.top - pageTop);
        breaks.push({
          afterIndex: index - 1,
          fillerHeightPx: Math.min(pageContentHeightPx, Math.max(0, Math.round(rest))),
        });
        pageTop = block.top;
      }
    }
    pendingBreak = block.forceBreakAfter;
  });

  return breaks;
}

/**
 * White filler px for the LAST page so short final pages still render as a
 * full independent sheet (content top-aligned, rest blank). Zero when the
 * last page already overflows (oversized block).
 */
export function planTailFiller(
  blocks: ReadonlyArray<PaginatableBlock>,
  pageContentHeightPx: number,
  breaks: ReadonlyArray<PageBreakPlan>
): number {
  if (blocks.length === 0 || !(pageContentHeightPx > 0)) return 0;
  const lastBreakAfter = breaks.length > 0 ? breaks[breaks.length - 1].afterIndex : -1;
  const lastPageFirst = blocks[lastBreakAfter + 1] ?? blocks[0];
  const pageTop = lastPageFirst.top;
  const lastBlock = blocks[blocks.length - 1];
  const lastBottom = lastBlock.top + lastBlock.height;
  return Math.min(pageContentHeightPx, Math.max(0, Math.round(pageContentHeightPx - (lastBottom - pageTop))));
}
