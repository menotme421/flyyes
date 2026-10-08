import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { createWordExtensions } from "@/editor/editorExtensions";
import { cancelGapRecompute, flushGapRecompute, resetGapPositions, scheduleGapRecompute } from "./pageBreakIndicators";
import { saveLocalDocumentContent } from "@/services/documentService";
import { cmToPx, type ResolvedPageSetup } from "@/services/pageSetupService";
import type { PageOrientation } from "@/storage/documentTypes";
import { logError } from "@/utils/appLogger";
import { TableContextMenu } from "./TableContextMenu";
import { EditorToolbar } from "./EditorToolbar";
import { SearchPanel } from "@/components/SearchPanel";
import { StatusBar } from "@/components/StatusBar";

// WHY: Word/Docs shell — formatting ribbon on top, then centered white page
// on gray canvas. Page padding = preset margins, sheet ratio = preset paper,
// so what you see matches preview, print, and DOCX.
// Page stays white with black text (even in dark mode) exactly like Word.
// Zoom lives in the ribbon (Docs-style dropdown); saved content is untouched.

interface DocumentEditorProperties {
  documentId: string;
  initialContentJson: string;
  zoomPercent: number;
  onZoomChange: (nextZoom: number) => void;
  pageSetup: ResolvedPageSetup;
  onPageSetupChange: (presetId: string, orientation: PageOrientation) => void;
  onSaved: (contentJson: string, contentHtml: string) => void;
  onError: (message: string) => void;
  savedLabel?: string;
}

export function DocumentEditor({
  documentId,
  initialContentJson,
  zoomPercent,
  onZoomChange,
  pageSetup,
  onPageSetupChange,
  onSaved,
  onError,
  savedLabel = "",
}: DocumentEditorProperties) {
  // WHY: useMemo so extensions aren't recreated each render (would reset editor).
  const extensions = useMemo(() => createWordExtensions(), []);
  // WHY: Local live copy feeds onSaved for preview/status.
  const [, setLiveHtml] = useState("");
  // WHY: Search panel visibility lives here (owns the editor instance).
  // Ctrl+F is captured at window level so it works from anywhere in the doc.
  const [searchOpen, setSearchOpen] = useState(false);
  // WHY: Ref mirror of the computed page height — the editor is created once,
  // so the update closure below would otherwise paginate with stale zoom/margins.
  const contentHeightRef = useRef(0);
  const editor = useEditor({
    extensions,
    content: parseInitialContent(initialContentJson),
    editorProps: {
      // Page interior: white sheet, black text. Padding + height come from
      // --page-* vars (per-document margins) via index.css.
      attributes: { class: "tiptap bg-white text-black outline-none" },
    },
    onUpdate: ({ editor: updatedEditor, transaction }) => {
      // WHY: Gap-only transactions must not dirty the document — without this
      // guard every gap pass would rewrite updatedAt (and click/selection
      // transactions already did; this stops that churn too).
      if (transaction.docChanged) {
        scheduleAutosave(
          documentId,
          updatedEditor.getJSON(),
          updatedEditor.getHTML(),
          (freshJson, freshHtml) => {
            setLiveHtml(freshHtml);
            onSaved(freshJson, freshHtml);
          },
          onError
        );
      }
      scheduleGapRecompute(updatedEditor, contentHeightRef.current);
    },
  });

  useEffect(() => {
    return () => {
      clearPendingAutosave();
      cancelGapRecompute();
      editor?.destroy();
    };
  }, [editor]);

  const pageWidth = Math.round((pageSetup.paperWidthPx * zoomPercent) / 100);
  // WHY: True paper ratio from the preset (A4 portrait 210:297, Letter, Legal,
  // A5, landscape, ...) — content height = full sheet minus margin padding,
  // so an empty page measures as a real sheet instead of looking like a slide.
  const pageAspect = pageSetup.paperHeightPx / pageSetup.paperWidthPx;
  const padTop = cmToPx(pageSetup.margins.topCm);
  const padRight = cmToPx(pageSetup.margins.rightCm);
  const padBottom = cmToPx(pageSetup.margins.bottomCm);
  const padLeft = cmToPx(pageSetup.margins.leftCm);
  const pageMinHeight = Math.max(200, Math.round(pageWidth * pageAspect - padTop - padBottom));
  const pageContentHeight = Math.max(200, Math.round(pageWidth * pageAspect - padTop - padBottom));
  contentHeightRef.current = pageContentHeight;

  // WHY: Reflow triggers beyond edits — zoom/margins come through props,
  // window resizes and webfont loads reflow text. All funnel into the same
  // debounced, change-detecting scheduler (steady state dispatches nothing).
  // beforeprint flushes synchronously (covers Ctrl+P and the Export menu)
  // so the printed page breaks are never one debounced pass stale.
  useEffect(() => {
    if (!editor) return;
    // WHY: Fresh editor may inherit stale positions from the previous document
    // still sitting in the module slot — clear before first paint.
    resetGapPositions();
    scheduleGapRecompute(editor, contentHeightRef.current);
    const handleResize = () => {
      if (!editor.isDestroyed) scheduleGapRecompute(editor, contentHeightRef.current);
    };
    const handleBeforePrint = () => {
      if (!editor.isDestroyed) flushGapRecompute(editor, contentHeightRef.current);
    };
    // WHY: Belt-and-braces for IME recovery — ProseMirror usually dispatches
    // on compositionend (covered by onUpdate), but a cancelled/empty
    // composition may end with no transaction at all. Listening directly
    // guarantees pagination resumes the instant composing stops.
    const handleCompositionEnd = () => {
      if (!editor.isDestroyed) scheduleGapRecompute(editor, contentHeightRef.current);
    };
    // WHY: Typing fires onUpdate, but images loading, font swaps, and webfont
    // reflow change heights with no transaction at all — observe the editable
    // DOM so those reflow into pagination too. Fires rarely; the rAF throttle
    // coalesces bursts and the sig guard makes steady state free.
    // WHY: TipTap v3 throws when touching view.dom before the view mounts
    // (React dev double-invokes effects, and child cleanup unmounts the view
    // before our cleanup runs — both hit unguarded access with an error
    // boundary). Every direct view.dom touch in this effect goes through the
    // guard below; a missed round simply skips listeners until deps re-fire.
    const viewDom = mountedViewDom(editor);
    let domObserver: ResizeObserver | undefined;
    if (viewDom) {
      try {
        domObserver = new ResizeObserver(() => {
          if (!editor.isDestroyed) scheduleGapRecompute(editor, contentHeightRef.current);
        });
        domObserver.observe(viewDom);
      } catch {
        // Older browsers: window resize + transactions still cover the rest.
        domObserver = undefined;
      }
      viewDom.addEventListener("compositionend", handleCompositionEnd);
    }
    window.addEventListener("resize", handleResize);
    window.addEventListener("beforeprint", handleBeforePrint);
    document.fonts?.ready
      .then(() => {
        if (!editor.isDestroyed) scheduleGapRecompute(editor, contentHeightRef.current);
      })
      .catch(() => {});
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("beforeprint", handleBeforePrint);
      // WHY: Same guard as mount — by cleanup time the view may already be
      // torn down (child-first unmount order). Remove from the exact node we
      // attached to, never re-read a possibly dead view.
      if (viewDom) viewDom.removeEventListener("compositionend", handleCompositionEnd);
      domObserver?.disconnect();
    };
  }, [editor, pageContentHeight]);

  // WHY: Ctrl/Cmd+F opens our panel instead of the browser bar (Word behavior).
  // Registered once per editor lifetime; the panel's own Esc handler closes it.
  useEffect(() => {
    const handleFindShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleFindShortcut);
    return () => window.removeEventListener("keydown", handleFindShortcut);
  }, []);

  if (!editor) {
    return <p className="cds--type-body-01 fly-pad-06 text-muted-foreground">Loading editor…</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Full-width ribbon like Word. Single divider below the title row
          (the header owns its own bottom border), single line under the ribbon. */}
      {/* Full-width ribbon like Word. Sticks below the title row (shared
          --editor-bar-top offset, tucked 1px under so fractional header
          heights never open a slit that scrolled content bleeds through)
          so formatting stays reachable on page 10. */}
      <div className="fly-ribbon-bar no-print sticky top-[calc(var(--editor-bar-top,53px)-1px)] z-10 rounded-none bg-background">
        <EditorToolbar editor={editor} onSearchOpen={() => setSearchOpen(true)} />
      </div>

      {/* Gray canvas with centered white A4 page (margins = page padding).
          WHY: No outer shadow on the sheet — one continuous shadow would run
          straight through the inter-page seams and make them look inset.
          Sheets read as separate pages because each seam bleeds past the
          sheet edges (see .page-gap-strip). overflow-x-clip keeps that bleed
          from ever causing a horizontal scrollbar when zoomed. */}
      <div className="fly-preview-wrap flex flex-1 justify-center overflow-x-clip bg-muted/60 print:bg-white">
        {/* WHY: Relative anchor for the floating SearchPanel (absolute right). */}
        <div
          className="word-page relative h-fit w-full bg-white text-black"
          style={{
            maxWidth: pageWidth,
            "--page-min-height": `${pageMinHeight}px`,
            "--page-pad-top": `${padTop}px`,
            "--page-pad-right": `${padRight}px`,
            "--page-pad-bottom": `${padBottom}px`,
            "--page-pad-left": `${padLeft}px`,
          } as CSSProperties}
        >
          <SearchPanel editor={editor} open={searchOpen} onClose={() => setSearchOpen(false)} />
          {/* WHY: Right-click table menu (vertical, submenus) — trigger wraps
              the editable area; native menu survives outside tables. */}
          <TableContextMenu editor={editor}>
            <div>
              <EditorContent editor={editor} />
            </div>
          </TableContextMenu>
        </div>
      </div>

      {/* WHY: Word-style bottom bar — live counts plus zoom and page setup
          (moved out of the ribbon so formatting owns the bar alone). */}
      <StatusBar
        editor={editor}
        savedLabel={savedLabel}
        zoomPercent={zoomPercent}
        onZoomChange={onZoomChange}
        pageSetup={pageSetup}
        onPageSetupChange={onPageSetupChange}
      />
    </div>
  );
}

function parseInitialContent(contentJson: string) {
  try {
    return JSON.parse(contentJson) as object;
  } catch {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
}

/**
 * Null-safe view.dom read. TipTap v3's view proxy throws when `.dom` is
 * touched before mount / after teardown — callers must never access
 * `editor.view.dom` directly in effects or cleanups.
 */
function mountedViewDom(editor: { view: { dom: unknown } }): HTMLElement | null {
  try {
    const dom: unknown = editor.view.dom;
    return dom instanceof HTMLElement ? dom : null;
  } catch {
    return null;
  }
}

// Module-level debounce (one editor at a time keeps this simple and testable).
let autosaveTimer: number | undefined;

function clearPendingAutosave(): void {
  if (autosaveTimer !== undefined) {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
  }
}

function scheduleAutosave(
  documentId: string,
  contentJsonObject: object,
  contentHtml: string,
  onSaved: (contentJson: string, contentHtml: string) => void,
  onError: (message: string) => void
): void {
  clearPendingAutosave();
  autosaveTimer = window.setTimeout(async () => {
    try {
      const contentJson = JSON.stringify(contentJsonObject);
      await saveLocalDocumentContent(documentId, contentJson, contentHtml);
      onSaved(contentJson, contentHtml);
    } catch (error) {
      logError("Autosave failed", {});
      onError(error instanceof Error ? error.message : "Autosave failed.");
    }
  }, 800);
}
