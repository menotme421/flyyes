import { paginateHtmlForPreview } from "@/services/pagePreviewService";
import { cmToPx, type ResolvedPageSetup } from "@/services/pageSetupService";

// WHY: Paper sheets on gray canvas like Word/Docs. Aspect ratio comes from the
// preset (A4, Letter, Legal, A5, landscape, ...) so preview sheets are
// true-sized on screen; @page CSS (dynamic per document) makes browser
// Print → PDF match. Padding = preset margins, so preview matches edit + DOCX.
// Content is already sanitized at save/import; React renders via dangerouslySetInnerHTML
// only with our own stored HTML (never raw user file bytes).

interface DocumentPagePreviewProperties {
  title: string;
  contentHtml: string;
  pageSetup: ResolvedPageSetup;
}

export function DocumentPagePreview({ title, contentHtml, pageSetup }: DocumentPagePreviewProperties) {
  // WHY: Live margins + paper feed pagination (not just padding) — sheets break
  // where the shared engine says, consistent with edit-mode gaps.
  const margins = pageSetup.margins;
  const pages = paginateHtmlForPreview(contentHtml, margins, pageSetup.paperHeightPx);
  const padTop = cmToPx(margins.topCm);
  const padSide = cmToPx(margins.leftCm);
  const padSideRight = cmToPx(margins.rightCm);
  const padBottom = cmToPx(margins.bottomCm);

  return (
    <div className="flex flex-col items-center gap-6 bg-muted/60 p-6 print:bg-white print:p-0">
      {pages.map((page) => (
        <section
          key={page.pageNumber}
          aria-label={`${title} page ${page.pageNumber} of ${page.totalPages}`}
          className="page-sheet w-full bg-white text-black shadow-md print:shadow-none"
          style={{
            maxWidth: pageSetup.paperWidthPx,
            aspectRatio: `${pageSetup.paperWidthPx} / ${pageSetup.paperHeightPx}`,
          }}
        >
          <header
            className="flex items-center justify-between border-b border-border pt-8 text-xs text-muted-foreground"
            style={{ paddingLeft: padSide, paddingRight: padSideRight }}
          >
            <span className="truncate">{title}</span>
            <span>Page {page.pageNumber} of {page.totalPages}</span>
          </header>
          <div
            className="tiptap"
            style={{ paddingTop: padTop, paddingLeft: padSide, paddingRight: padSideRight, paddingBottom: padBottom }}
            // Stored editor HTML only (see note above).
            dangerouslySetInnerHTML={{ __html: page.htmlBlocks.join("") || "<p></p>" }}
          />
          <footer
            className="flex items-center justify-center border-t border-border pb-8 pt-2 text-xs text-muted-foreground"
            style={{ paddingLeft: padSide, paddingRight: padSideRight }}
          >
            Flyyes Docs · local preview — use Print for PDF
          </footer>
        </section>
      ))}
    </div>
  );
}
