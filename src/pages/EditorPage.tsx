import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Eye, PenLine as PenLineIcon } from "lucide-react";
import { DocumentPagePreview } from "@/components/DocumentPagePreview";
import { ExportMenu } from "@/components/ExportMenu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ZoomSelect } from "@/components/ZoomSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLocalDocument, renameLocalDocument, updatePageSetup } from "@/services/documentService";
import { buildAtPageCss, resolvePageSetup, type ResolvedPageSetup } from "@/services/pageSetupService";
import type { LocalDocument, PageOrientation } from "@/storage/documentTypes";
import { logError } from "@/utils/appLogger";

// WHY: Lazy-load heavy TipTap editor + converters so home list loads fast.
const DocumentEditor = lazy(() =>
  import("@/editor/DocumentEditor").then((module) => ({ default: module.DocumentEditor }))
);

// WHY: Word/Docs shell — one slim app bar on top (back + title + view toggle).
// Export lives under a single Export menu: in the toolbar for Edit mode,
// in a slim bar above the preview for Pages mode. No scattered export buttons.
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
      <div className="mx-auto max-w-3xl p-6">
        <p className="rounded-md border border-border bg-muted p-4 text-sm">{error}</p>
        <Button className="mt-4" variant="outline" onClick={onBack}><ArrowLeft /> Back</Button>
      </div>
    );
  }

  if (!document) {
    return <p className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">Loading…</p>;
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
      <header ref={headerRef} className={`no-print sticky top-0 z-20 bg-background ${viewMode === "edit" ? "" : "border-b border-border"}`}>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2">
          {/* WHY: No in-app back button — browser back returns to the list
              (App syncs views to history). Title row holds title + status,
              with the icon-only Edit/Pages toggle pinned at the far end so
              the ribbon below stays purely for formatting. */}
          <Input
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={() => void handleRename()}
            onKeyDown={(event) => { if (event.key === "Enter") void handleRename(); }}
            aria-label="Document title"
            maxLength={200}
            placeholder="Untitled document"
            className="max-w-md border-transparent bg-transparent text-base font-medium hover:border-input focus:border-input"
            // WHY: Width follows the title length (ch units) instead of flex-1
            // stretching — keeps "Last saved" snug next to short titles.
            style={{ width: `${Math.min(64, Math.max(14, titleDraft.length + 2))}ch` }}
          />
          <span className="hidden text-xs text-muted-foreground sm:inline">{status}</span>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => {
              if (value === "edit" || value === "pages") setViewMode(value);
            }}
            aria-label="View mode"
            className="ml-auto rounded-md border border-transparent p-0.5 hover:border-input focus-within:border-input"
          >
            <ToggleGroupItem value="edit" aria-label="Edit view" title="Edit">
              <PenLineIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="pages" aria-label="Pages view" title="View pages">
              <Eye />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {error ? <p className="mx-4 mb-2 rounded-md border border-border bg-muted p-2 text-sm">{error}</p> : null}
      </header>

      {/* Center canvas */}
      <main className="flex min-h-0 flex-1 flex-col">
        {viewMode === "edit" ? (
          <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading editor…</p>}>
            <DocumentEditor
              documentId={document.id}
              initialContentJson={document.contentJson}
              editableTitle={titleDraft || document.title}
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
            <div className="no-print sticky top-[calc(var(--editor-bar-top,53px)-1px)] z-10 flex items-center justify-between border-b border-border bg-background px-4 py-1.5">
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
