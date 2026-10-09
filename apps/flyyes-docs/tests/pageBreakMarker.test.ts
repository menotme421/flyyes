import { describe, expect, it } from "vitest";
import { assemblePreviewPages } from "@/services/pagePreviewService";
import { planPageBreaks } from "@/services/paginationPlanner";

// WHY: HR is the manual page-break marker — preview must open a fresh page
// after it while hiding the marker itself (edit shows the labeled badge;
// print/DOCX only break). assemblePreviewPages is DOM-free so these run in
// plain node without DOMParser.

function planFor(blocks: Array<{ top: number; height: number; forceBreakAfter?: boolean }>): Set<number> {
  return new Set(
    planPageBreaks(blocks.map((block) => ({ ...block, forceBreakAfter: block.forceBreakAfter ?? false })), 212)
  );
}

describe("page-break markers in preview", () => {
  it("opens a fresh page after the marker and hides the marker", () => {
    const raw = ["<p>first</p>", "<hr>", "<p>second</p>"];
    const planned = [
      { top: 0, height: 43 },
      { top: 43, height: 40, forceBreakAfter: true },
      { top: 83, height: 43 },
    ];
    const pages = assemblePreviewPages(raw, planFor(planned));
    expect(pages).toHaveLength(2);
    expect(pages[0].join("")).toContain("first");
    expect(pages[1].join("")).toContain("second");
    for (const page of pages) {
      expect(page.join("")).not.toMatch(/<hr/i);
    }
  });

  it("emits no trailing page for a trailing marker", () => {
    const raw = ["<p>hi</p>", "<hr>"];
    const planned = [
      { top: 0, height: 43 },
      { top: 43, height: 40, forceBreakAfter: true },
    ];
    const pages = assemblePreviewPages(raw, planFor(planned));
    expect(pages).toHaveLength(1);
    expect(pages[0].join("")).toContain("hi");
  });

  it("still renders one empty sheet for a marker-only document", () => {
    const pages = assemblePreviewPages(["<hr>"], new Set<number>());
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual([]);
  });
});
