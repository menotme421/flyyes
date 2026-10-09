import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Edit, View } from "@carbon/icons-react";
import { Button, ContentSwitcher, IconSwitch } from "@carbon/react";
import { DocumentPagePreview } from "@/components/DocumentPagePreview";
import { ExportMenu } from "@/components/ExportMenu";
import { ZoomSelect } from "@/components/ZoomSelect";
import { getLocalDocument, renameLocalDocument, updatePageSetup } from "@/services/documentService";
import { buildAtPageCss, resolvePageSetup, type ResolvedPageSetup } from "@/services/pageSetupService";
import type { LocalDocument, PageOrientation } from "@/storage/documentTypes";
import { logError } from "@/utils/appLogger";

// WHY: Lazy-load heavy TipTap editor + converters so home list loads fast.
const DocumentEditor = lazy(() =>
  import("@/editor/DocumentEditor").then((module) => ({ default: module.DocumentEditor }))
);

// WHY: Word/Docs shell — one slim app bar on top (back + title + status,
// view switch, Export). Export is a document action so it lives here in Edit
// mode (and in the slim bar above the preview for Pages mode).
interface EditorPageProperties {
  documentId: string;
  onBack: () => void;
}

type ViewMode = "edit" | "pages";

export function EditorPage({ documentId, onBack }: EditorPageProperties) {
  const [document, setDocument] = useState<LocalDocument | null>(null);
  const [liveJson, setLiveJson] = useState<string | null>(null);
  const [liveHtml, setLiveHtml] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [liveSetup, setLiveSetup] = useState<ResolvedPageSetup | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [status, setStatus] = useState("Loading…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await getLocalDocument(documentId);
        if (cancelled) return;
        if (!loaded) {
          setError("Document not found. It may have been deleted.");
          return;
        }
        setDocument(loaded);
        setLiveJson(loaded.contentJson);
        setLiveHtml(loaded.contentHtml);
        setLiveSetup(resolvePageSetup(loaded.pagePresetId, loaded.pageMargins, loaded.pageOrientation));
        setTitleDraft(loaded.title);
        setStatus(`Last saved ${new Date(loaded.updatedAt).toLocaleTimeString()}`);
      } catch {
        logError("Editor load failed", {});
        if (!cancelled) setError("Could not open document.");
      }
    })();
    return () => { cancelled = true; };
  }, [documentId]);

  async function handleRename(): Promise<void> {
    if (!document) return;
    const clean = titleDraft.trim();
    if (!clean) {
      setError("Title cannot be empty.");
      return;
    }
    try {
      await renameLocalDocument(document.id, clean);
      setDocument({ ...document, title: clean });
      setError(null);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Rename failed.");
    }
  }

  // WHY: The edit ribbon and the pages bar both stick BELOW the title row
  // (sticky stack). The title row height isn't constant (error banner,
  // wrapping, zoom text), so measure it and expose as --editor-bar-top for
  // the sticky bars to consume — no hardcoded px to drift out of sync.
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    // WHY: Header mounts only after the document loads (loading screen has
    // none), so re-run then — a [] dep would measure null and never recover.
    const page = pageRef.current;
    const header = headerRef.current;
    if (!page || !header) return;
    const syncOffset = () => {
      page.style.setProperty("--editor-bar-top", `${header.offsetHeight}px`);
    };
    syncOffset();
    const observer = new ResizeObserver(syncOffset);
    observer.observe(header);
    return () => observer.disconnect();
  }, [document]);

  // WHY: Hooks stay above the early returns (loading / not-found screens).
  const liveSetupValue =
    liveSetup ?? resolvePageSetup(document?.pagePresetId, document?.pageMargins, document?.pageOrientation);

  // WHY: The browser's @page rule can't read CSS vars or props, so the current
  // document's paper + margins are injected as a <style> tag (static @page in
  // index.css stays as fallback). Print/PDF then uses the preset, not fixed A4.
  useEffect(() => {
    const styleId = "flyyes-page-setup";
    const head = window.document.head;
    let tag = head.querySelector<HTMLStyleElement>(`#${styleId}`);
    if (!tag) {
      tag = window.document.createElement("style");
      tag.id = styleId;
      head.append(tag);
    }
    tag.textContent = buildAtPageCss(liveSetupValue);
    return () => {
      window.document.head.querySelector(`#${styleId}`)?.remove();
    };
  }, [liveSetupValue]);

  if (error && !document) {
    return (
      <div className="fly-page-narrow flex flex-col items-start gap-4">
        <p className="cds--type-body-01 fly-banner w-full rounded-md bg-muted">{error}</p>
        <Button kind="tertiary" renderIcon={ArrowLeft} onClick={onBack}>Back</Button>
      </div>
    );
  }

  if (!document) {
    return <p className="cds--type-body-01 fly-page-narrow text-muted-foreground">Loading…</p>;
  }

  const exportJson = liveJson ?? document.contentJson;
  const exportHtml = liveHtml ?? document.contentHtml;

  async function handlePresetChange(presetId: string, orientation: PageOrientation): Promise<void> {
    if (!document) return;
    try {
      await updatePageSetup(document.id, presetId, orientation);
      setLiveSetup(resolvePageSetup(presetId, document.pageMargins, orientation));
      setDocument({ ...document, pagePresetId: presetId, pageOrientation: orientation });
      setError(null);
    } catch (marginsError) {
      setError(marginsError instanceof Error ? marginsError.message : "Could not save page setup.");
    }
  }
  // WHY: CSS `zoom` scales pages without touching content (export/print unaffected).
  const zoomStyle = { zoom: zoomPercent / 100 } as CSSProperties;

  return (
    <div ref={pageRef} className="flex min-h-screen flex-col bg-muted/60">
      {/* Docs-style title row above the toolbar (both modes share it):
          back + editable title + save status. Ribbon with fonts + Export
          and the Edit/Pages switch sits below it. */}
      {/* Docs-style title row. In edit mode it has NO bottom border so the title
          flows seamlessly into the ribbon below (your ask); the ribbon draws
          the single divider under itself. Pages mode keeps its border. */}
      <header ref={headerRef} className={`fly-title-row no-print sticky top-0 z-20 bg-background ${viewMode === "edit" ? "" : "fly-title-row-bordered"}`}>
        <div className="flex flex-wrap items-center gap-2">
          {/* WHY: No in-app back button — browser back returns to the list
              (App syncs views to history). Title row holds title + status,
              with the icon-only Edit/Pages toggle pinned at the far end so
              the ribbon below stays purely for formatting. */}
          <input
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={() => void handleRename()}
            onKeyDown={(event) => { if (event.key === "Enter") void handleRename(); }}
            aria-label="Document title"
            maxLength={200}
            placeholder="Untitled document"
            className="fly-title-input max-w-md rounded-md bg-transparent text-base font-medium outline-none transition-colors"
            // WHY: Width follows the title length (ch units) instead of flex-1
            // stretching — keeps "Last saved" snug next to short titles.
            style={{ width: `${Math.min(64, Math.max(14, titleDraft.length + 2))}ch` }}
          />
          <span className="cds--type-body-compact-01 hidden text-muted-foreground sm:inline">{status}</span>
          {/* WHY: Icon switcher for Edit / read-only Pages. Two nested plain
              wrappers: the outer is exactly the zoom's width (w-28) so both
              right edges land on the same line; the inner hugs content width
              and pins right, giving the small-on-top look. (Widths live on
              plain divs — Carbon's switcher is 100% wide and beats width
              utilities placed on itself.) */}
          <div className="fly-push-right w-28">
            <div className="fly-push-right w-fit">
              <ContentSwitcher
                size="sm"
                selectedIndex={viewMode === "edit" ? 0 : 1}
                onChange={(params) => setViewMode(params.index === 1 ? "pages" : "edit")}
              >
              <IconSwitch name="edit" text="Edit" align="bottom">
                <Edit />
              </IconSwitch>
              <IconSwitch name="pages" text="Pages" align="bottom">
                <View />
              </IconSwitch>
              </ContentSwitcher>
            </div>
          </div>
          {/* WHY: Export is a document-level action, not inline editing — it
              lives in the header in Edit mode (Pages mode keeps its slim bar
              menu below). */}
          {viewMode === "edit" && document ? (
            <ExportMenu
              documentTitle={document.title}
              contentJson={exportJson}
              contentHtml={exportHtml}
              pageMargins={liveSetupValue.margins}
              paperSizeMm={{ widthMm: liveSetupValue.paperWidthMm, heightMm: liveSetupValue.paperHeightMm }}
              onError={(message) => setError(message)}
            />
          ) : null}
        </div>
        {error ? <p className="cds--type-body-01 fly-banner-sm fly-title-error rounded-md bg-muted">{error}</p> : null}
      </header>

      {/* Center canvas */}
      <main className="flex min-h-0 flex-1 flex-col">
        {viewMode === "edit" ? (
          <Suspense fallback={<p className="cds--type-body-01 fly-pad-06 text-muted-foreground">Loading editor…</p>}>
            <DocumentEditor
              documentId={document.id}
              initialContentJson={document.contentJson}
              zoomPercent={zoomPercent}
              onZoomChange={setZoomPercent}
              pageSetup={liveSetupValue}
              onPageSetupChange={(presetId, orientation) => void handlePresetChange(presetId, orientation)}
              savedLabel={status}
              onSaved={(freshJson, freshHtml) => {
                setLiveJson(freshJson);
                setLiveHtml(freshHtml);
                setStatus(`Last saved ${new Date().toLocaleTimeString()}`);
              }}
              onError={(message) => setError(message)}
            />
          </Suspense>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* Slim View bar: Export left, zoom right. Sticks like the edit
                ribbon (same title-row offset) so long previews keep controls. */}
            <div className="fly-viewbar no-print sticky top-[calc(var(--editor-bar-top,53px)-1px)] z-10 flex items-center justify-between bg-background">
              <ExportMenu
                documentTitle={document.title}
                contentJson={exportJson}
                contentHtml={exportHtml}
                pageMargins={liveSetupValue.margins}
                paperSizeMm={{ widthMm: liveSetupValue.paperWidthMm, heightMm: liveSetupValue.paperHeightMm }}
                onError={(message) => setError(message)}
              />
              <ZoomSelect zoomPercent={zoomPercent} onZoomChange={setZoomPercent} />
            </div>
            <div style={zoomStyle} className="flex-1">
              <DocumentPagePreview title={document.title} contentHtml={exportHtml} pageSetup={liveSetupValue} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
