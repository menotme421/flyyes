import { useLayoutEffect, useRef, useState } from "react";

// WHY: Own file — the home grid shows a mini A4 first page per document.
// Renders the stored HTML (already sanitized at save/import, same trust model
// as the pages preview) scaled from true A4 width (794px) to the card width,
// so the thumbnail reads as the document's actual first sheet. aria-hidden +
// pointer-events-none: decoration only, never interactive. content-visibility
// keeps long grids fast (off-screen cards skip rendering).

/** A4 sheet width at 96dpi — shared with the pagination engine. */
const SHEET_WIDTH_PX = 794;

interface DocumentThumbnailProperties {
  html: string;
  title: string;
}

export function DocumentThumbnail({ html, title }: DocumentThumbnailProperties) {
  const boxReference = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  // WHY: Transform scale (not CSS zoom) so it works identically in every
  // browser. Measured per card because grid columns are responsive.
  useLayoutEffect(() => {
    const box = boxReference.current;
    if (!box) return;
    const syncScale = () => {
      const width = box.clientWidth;
      if (width > 0) setScale(width / SHEET_WIDTH_PX);
    };
    syncScale();
    const observer = new ResizeObserver(syncScale);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxReference}
      className="relative aspect-[210/297] w-full overflow-hidden bg-white"
      style={{ contentVisibility: "auto" }}
      aria-hidden="true"
    >
      <div
        className="tiptap pointer-events-none absolute left-0 top-0 select-none"
        style={{ width: SHEET_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}
        // Stored editor HTML only (sanitized at save/import — never raw uploads).
        dangerouslySetInnerHTML={{ __html: html || `<p>${escapeTitle(title)}</p>` }}
      />
    </div>
  );
}

// WHY: Empty docs have no HTML yet — show the title as a placeholder line so
// the card never renders a naked white box. Title is escaped (never HTML).
function escapeTitle(title: string): string {
  return title.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}
