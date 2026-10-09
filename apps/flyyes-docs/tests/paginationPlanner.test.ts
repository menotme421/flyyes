import { describe, expect, it } from "vitest";
import { A4_HEIGHT_PX, A4_WIDTH_PX, planPageBreaks, planPageBreaksWithFiller, planTailFiller } from "@/services/paginationPlanner";
import { estimateBlockHeightPx } from "@/services/pagePreviewService";

// WHY: One engine drives edit gaps (measured) and preview sheets (estimated) —
// these pins guarantee the shared policy both callers rely on.

function block(top: number, height: number, forceBreakAfter = false) {
  return { top, height, forceBreakAfter };
}

describe("planPageBreaks", () => {
  it("returns nothing for empty or invalid input", () => {
    expect(planPageBreaks([], 900)).toEqual([]);
    expect(planPageBreaks([block(0, 100)], 0)).toEqual([]);
    expect(planPageBreaks([block(0, 100)], -50)).toEqual([]);
  });

  it("never breaks single-page content", () => {
    expect(planPageBreaks([block(0, 100), block(100, 200)], 900)).toEqual([]);
  });

  it("pushes overflowing blocks whole to the next page (block-push V1)", () => {
    // WHY: Bottom-overflow policy — page 1 keeps b0 (0..500), b1 (500..1000)
    // would overflow 900, so it opens page 2 with a 400px white filler above it.
    const blocks = [block(0, 500), block(500, 500), block(1000, 100)];
    expect(planPageBreaks(blocks, 900)).toEqual([0]);
  });

  it("breaks before oversized blocks mid-page without splitting them", () => {
    // WHY: The 2000px table overflows pages 1–3; content at 2100 starts a new
    // visual region, so it gets its own gap too.
    const blocks = [block(0, 100), block(100, 2000), block(2100, 100)];
    expect(planPageBreaks(blocks, 900)).toEqual([0, 1]);
  });

  it("breaks before content following an overflowing first block", () => {
    expect(planPageBreaks([block(0, 2000), block(2000, 100)], 900)).toEqual([0]);
  });

  it("forces a break after manual break markers", () => {
    const blocks = [block(0, 100), block(100, 20, true), block(120, 100)];
    expect(planPageBreaks(blocks, 900)).toEqual([1]);
  });

  it("never emits a trailing break", () => {
    const blocks = [block(0, 100), block(100, 20, true)];
    expect(planPageBreaks(blocks, 900)).toEqual([]);
  });

  it("shares A4 geometry with the edit surface", () => {
    expect(A4_WIDTH_PX).toBe(794);
    expect(A4_HEIGHT_PX).toBe(1123);
  });

  it("reports white filler heights for independent sheets", () => {
    const blocks = [block(0, 500), block(500, 500), block(1000, 100)];
    const plans = planPageBreaksWithFiller(blocks, 900);
    expect(plans).toEqual([{ afterIndex: 0, fillerHeightPx: 400 }]);
  });

  it("fills the last short page so it renders as a full sheet", () => {
    const blocks = [block(0, 500), block(500, 500), block(1000, 100)];
    const plans = planPageBreaksWithFiller(blocks, 900);
    // Last page: pageTop=500, lastBottom=1100 → 900-(1100-500)=300.
    expect(planTailFiller(blocks, 900, plans)).toBe(300);
  });

  it("clamps filler to zero when pages already overflow", () => {
    const blocks = [block(0, 100), block(100, 2000), block(2100, 100)];
    const plans = planPageBreaksWithFiller(blocks, 900);
    expect(plans[1].fillerHeightPx).toBe(0);
    expect(planTailFiller(blocks, 900, plans)).toBeGreaterThanOrEqual(0);
  });
});

describe("estimateBlockHeightPx", () => {
  it("marks rules as forced breaks", () => {
    expect(estimateBlockHeightPx("<hr>")).toMatchObject({ forceBreakAfter: true });
  });

  it("prices empty blocks as one margin-free line", () => {
    // WHY: Empty blocks render without block margins (see the
    // :has(> br:only-child) rule) — the estimate must match or preview
    // paginates later than edit on blank-line-heavy docs.
    expect(estimateBlockHeightPx("<p></p>").height).toBe(27);
    expect(estimateBlockHeightPx("<p><br></p>").height).toBe(27);
    expect(estimateBlockHeightPx("<h1></h1>").height).toBe(40);
    expect(estimateBlockHeightPx("<h2></h2>").height).toBe(34);
  });

  it("prices media fixed and headings above body text", () => {    const table = estimateBlockHeightPx("<table><tr><td>x</td></tr></table>");
    const para = estimateBlockHeightPx("<p>hi</p>");
    const heading = estimateBlockHeightPx("<h1>hi</h1>");
    expect(table.height).toBe(300);
    expect(para.height).toBeGreaterThan(0);
    expect(heading.height).toBeGreaterThan(para.height);
    expect(table.forceBreakAfter).toBe(false);
  });
});
