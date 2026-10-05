import { DEFAULT_PAGE_MARGINS, cmToPx } from "./pageSetupService";
import { A4_HEIGHT_PX, planPageBreaks } from "./paginationPlanner";
import type { PageMargins } from "@/storage/documentTypes";

// WHY: Free true-pages without TipTap Pro.
// Preview splits sanitized HTML blocks into sheets using the SHARED planner
// (same policy as edit-mode gaps): px-estimated heights against the preset's
// paper geometry, so both views agree. HorizontalRule (<hr>) forces a break.

export interface PageSlice {
  pageNumber: number;
  totalPages: number;
  htmlBlocks: string[];
}

// Average body metrics at 96dpi (16px font): ~85 chars/line, 27px line height.
const AVG_CHARS_PER_LINE = 85;
const BODY_LINE_HEIGHT_PX = 27;
const BLOCK_MARGIN_PX = 16;

/** Geometry-aware height estimate for one top-level HTML block. Exported for tests. */
export function estimateBlockHeightPx(blockHtml: string): { height: number; forceBreakAfter: boolean } {
  const trimmed = blockHtml.trim();
  if (/^<hr\b/i.test(trimmed)) return { height: 40, forceBreakAfter: true };
  // WHY: Fixed budgets for media (aspect unknown without loading) — same
  // policy as before, now expressed in px against real page geometry.
  if (/^<(table|img|figure)\b/i.test(trimmed)) return { height: 300, forceBreakAfter: false };
  const text = trimmed.replace(/<[^>]*>/g, "");
  // WHY: Empty blocks render margin-free (see the :has(> br:only-child) rule
  // in index.css) — budget the line only, or preview would paginate later
  // than the edit surface for blank-line-heavy docs.
  if (/^<h1\b/i.test(trimmed)) {
    return {
      height: text.length === 0 ? 40 : Math.max(1, Math.ceil(text.length / 45)) * 40 + 24,
      forceBreakAfter: false,
    };
  }
  if (/^<h[23]\b/i.test(trimmed)) {
    return {
      height: text.length === 0 ? 34 : Math.max(1, Math.ceil(text.length / 60)) * 34 + 20,
      forceBreakAfter: false,
    };
  }
  if (text.length === 0) {
    return { height: BODY_LINE_HEIGHT_PX, forceBreakAfter: false };
  }
  return {
    height: Math.max(1, Math.ceil(text.length / AVG_CHARS_PER_LINE)) * BODY_LINE_HEIGHT_PX + BLOCK_MARGIN_PX,
    forceBreakAfter: false,
  };
}

export function paginateHtmlForPreview(
  contentHtml: string,
  margins: PageMargins = DEFAULT_PAGE_MARGINS,
  paperHeightPx: number = A4_HEIGHT_PX
): PageSlice[] {
  // WHY: Normalize first — empty blocks must carry the same <br> the editor
  // uses, otherwise preview rows render shorter than edit rows (see below).
  const rawBlocks = splitTopLevelBlocks(normalizeEmptyBlocks(contentHtml))
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
  if (rawBlocks.length === 0) {
    return [{ pageNumber: 1, totalPages: 1, htmlBlocks: [] }];
  }

  const contentHeightPx = Math.max(
    200,
    paperHeightPx - cmToPx(margins.topCm) - cmToPx(margins.bottomCm)
  );
  let top = 0;
  const planned = rawBlocks.map((html) => {
    const { height, forceBreakAfter } = estimateBlockHeightPx(html);
    const block = { top, height, forceBreakAfter };
    top += height;
    return block;
  });
  const breakAfter = new Set(planPageBreaks(planned, contentHeightPx));
  const pagedBlocks = assemblePreviewPages(rawBlocks, breakAfter);

  return pagedBlocks.map((htmlBlocks, index) => ({
    pageNumber: index + 1,
    totalPages: pagedBlocks.length,
    htmlBlocks,
  }));
}

/**
 * Give empty blocks the <br> the edit surface renders.
 * WHY: ProseMirror keeps a <br> inside empty textblocks (caret needs a line
 * box), so edit rows measure one line tall — but stored HTML serializes them
 * bare (<td><p></p></td>), and a bare <p> has no line box, only margins. Same
 * CSS, different heights: preview tables came out squished next to edit.
 * Render-layer only (saved HTML, word count, and DOCX are untouched), and the
 * height estimator already budgets one line for empty blocks, so planning is
 * unaffected. Exported for tests.
 */
export function normalizeEmptyBlocks(html: string): string {
  return html.replace(
    /<(p|h1|h2|h3)>((?:\s|&nbsp;|<br\s*\/?>)*)<\/\1>/gi,
    (match, tag: string, inner: string) =>
      /<br\s*\/?>/i.test(inner) ? match : `<${tag}><br></${tag}>`
  );
}

/**
 * Pure page assembly (DOM-free, unit-testable): drops manual-break markers
 * (their planned break already opens the fresh page) and guarantees at least
 * one sheet so marker-only documents still preview a page.
 */
export function assemblePreviewPages(
  rawBlocks: ReadonlyArray<string>,
  breakAfterIndices: ReadonlySet<number>
): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  rawBlocks.forEach((html, index) => {
    // WHY: HR is the manual page-break marker — the break planned above already
    // opens the fresh page, so the marker itself stays out of the sheets (the
    // edit surface shows the labeled badge instead; print/DOCX only break).
    if (!/^<hr\b/i.test(html.trim())) current.push(html);
    if (breakAfterIndices.has(index)) {
      pages.push(current);
      current = [];
    }
  });
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);
  return pages;
}

export function splitTopLevelBlocks(html: string): string[] {
  // WHY: DOMParser (not regex) so malformed pasted HTML can't break pagination.
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const container = parsed.body.firstElementChild;
  if (!container) return [];
  return Array.from(container.children).map((child) => child.outerHTML);
}
