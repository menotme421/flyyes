import { toast } from "sonner";
import { logError } from "@/utils/appLogger";
import { cmToTwip, DEFAULT_PAGE_MARGINS, mmToTwip } from "./pageSetupService";
import type { PageMargins } from "@/storage/documentTypes";

// WHY: Free .docx export via `docx` lib (lazy-loaded, zero runtime deps, browser-safe).
// Maps TipTap JSON → real Word paragraphs/headings/lists/tables/images.
// Section margins + paragraph indents carry through so Word matches the app.
// Round-trip is faithful, not byte-identical (same caveat as paid Pro export).

interface TipTapNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: TipTapNode[];
}

type SupportedImageType = "png" | "jpg" | "gif" | "bmp";

interface FetchedImage {
  data: ArrayBuffer;
  type: SupportedImageType;
  width?: number;
  height?: number;
}

interface ImageExportContext {
  // WHY: Dedupes repeat URLs (fetch once) and collects one skip-list for the final toast.
  remoteCache: Map<string, Promise<FetchedImage | null>>;
  skippedRemoteImages: Set<string>;
}

// Max rendered image width in the Word file (points ≈ page content width).
const MAX_DOCX_IMAGE_WIDTH_PT = 450;
// Legacy box for images without known dimensions (pre-resize-era behavior, kept stable).
const LEGACY_IMAGE_BOX = { width: 500, height: 350 };

export async function exportJsonToDocx(
  title: string,
  contentJson: string,
  margins: PageMargins = DEFAULT_PAGE_MARGINS,
  paperSizeMm?: { widthMm: number; heightMm: number }
): Promise<void> {
  let parsed: { content?: TipTapNode[] };
  try {
    parsed = JSON.parse(contentJson) as { content?: TipTapNode[] };
  } catch {
    throw new Error("Document is corrupted and cannot be exported.");
  }

  try {
    // Lazy-load heavy docx builder only on export click.
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType, Table, TableRow, TableCell, ImageRun, PageBreak } =
      await import("docx");

    const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
    const imageContext: ImageExportContext = { remoteCache: new Map(), skippedRemoteImages: new Set() };
    // WHY: Trailing manual breaks would export a blank last page in Word —
    // drop them (edit gaps and preview never emit a trailing break either).
    const nodes = [...(parsed.content ?? [])];
    while (nodes.length > 0 && nodes[nodes.length - 1]?.type === "horizontalRule") nodes.pop();
    for (const node of nodes) {
      const converted = await convertNode(node, { Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType, Table, TableRow, TableCell, ImageRun, PageBreak }, imageContext);
      if (!converted) continue;
      // WHY: Lists expand to multiple paragraphs — flatten the marker object.
      if (typeof converted === "object" && converted !== null && "__multi" in (converted as Record<string, unknown>)) {
        for (const item of (converted as { __multi: unknown[] }).__multi) {
          children.push(item as InstanceType<typeof Paragraph>);
        }
      } else {
        children.push(converted as InstanceType<typeof Paragraph> | InstanceType<typeof Table>);
      }
    }
    if (children.length === 0) children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

    const doc = new Document({
      creator: "Flyyes Docs (local)",
      title: title || "Document",
      sections: [{
        // WHY: Same paper + margins as Page Setup (Word TWIP units) so the
        // file opens matching the app. No paper passed (legacy call) = Word default.
        properties: {
          page: {
            ...(paperSizeMm ? {
              size: {
                width: mmToTwip(paperSizeMm.widthMm),
                height: mmToTwip(paperSizeMm.heightMm),
              },
            } : {}),
            margin: {
              top: cmToTwip(margins.topCm),
              right: cmToTwip(margins.rightCm),
              bottom: cmToTwip(margins.bottomCm),
              left: cmToTwip(margins.leftCm),
            },
          },
        },
        children,
      }],
    });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${sanitizeFileName(title)}.docx`);
    // WHY: Never fail silently — hosts that block cross-site reads (CORS) mean
    // Word would otherwise just be missing pictures with no explanation.
    if (imageContext.skippedRemoteImages.size > 0) {
      const count = imageContext.skippedRemoteImages.size;
      toast.warning(
        `${count} remote image${count === 1 ? " was" : "s were"} skipped — ${
          count === 1 ? "its host blocks" : "their hosts block"
        } downloads. Upload images instead of linking for reliable export.`
      );
    }
  } catch (error) {
    logError("Docx export failed", {});
    throw new Error("Could not export .docx. Try HTML export instead.");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function convertNode(node: TipTapNode, lib: any, imageContext: ImageExportContext): Promise<unknown | null> {
  const { Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType, Table, TableRow, TableCell, ImageRun, PageBreak } = lib;

  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const headingMap = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      } as const;
      return new Paragraph({
        heading: headingMap[Math.min(6, Math.max(1, level)) as 1 | 2 | 3 | 4 | 5 | 6],
        alignment: mapAlign(node.attrs?.textAlign as string | undefined, AlignmentType),
        indent: indentToDocx(node.attrs?.indent),
        children: runsFromInline(node.content ?? [], TextRun),
      });
    }
    case "taskList": {
      // WHY: Word has no checkbox paragraphs — export ☐/☒ prefix (same as
      // Markdown - [ ]/[x]) so nothing is lost in translation.
      const out: unknown[] = [];
      for (const item of node.content ?? []) {
        if (item.type !== "taskItem") continue;
        const checked = item.attrs?.checked === true;
        const itemText = collectText(item);
        out.push(
          new Paragraph({
            indent: indentToDocx(item.attrs?.indent),
            children: [new TextRun({ text: `${checked ? "☒" : "☐"} ${itemText}`.slice(0, 5000) })],
          })
        );
      }
      if (out.length === 0) return null;
      return out.length === 1 ? out[0] : { __multi: out };
    }
    case "bulletList":
    case "orderedList": {
      // WHY: docx lib models lists as paragraphs with bullet/numbering.
      // We emit one paragraph per item (numbering restart is best-effort).
      const out: unknown[] = [];
      for (const item of node.content ?? []) {
        const itemText = collectText(item);
        out.push(
          new Paragraph({
            bullet: node.type === "bulletList" ? { level: 0 } : undefined,
            numbering: node.type === "orderedList" ? { reference: "default-numbering", level: 0 } : undefined,
            children: [new TextRun({ text: itemText.slice(0, 5000) })],
          })
        );
      }
      // Return first; caller flattens arrays below — handle by returning array marker.
      return out.length === 1 ? out[0] : { __multi: out };
    }
    case "blockquote":
    case "codeBlock":
    case "paragraph": {
      return new Paragraph({
        alignment: mapAlign(node.attrs?.textAlign as string | undefined, AlignmentType),
        indent: indentToDocx(node.attrs?.indent),
        children: runsFromInline(collectInlineNodes(node), TextRun),
      });
    }
    case "table": {
      const rows = (node.content ?? []).filter((n) => n.type === "tableRow").map((row) => {
        const cells = (row.content ?? []).map((cell) => {
          const cellText = collectText(cell);
          const cellBg = normalizeHexColor(cell.attrs?.backgroundColor);
          // WHY: Header shading mirrors the edit surface (light gray base so
          // empty header rows survive in Word too); an explicit cell fill
          // still wins, same precedence as the CSS.
          const headerShade = cell.type === "tableHeader" ? "F1F5F9" : undefined;
          // WHY: Merged cells must stay merged in Word (columnSpan/rowSpan),
          // and the cell's first block decides paragraph alignment — the app
          // edits both, so the file must carry both.
          const colspan = Math.max(1, Math.floor(Number(cell.attrs?.colspan)) || 1);
          const rowspan = Math.max(1, Math.floor(Number(cell.attrs?.rowspan)) || 1);
          const firstBlock = (cell.content ?? []).find(
            (child) => child.type === "paragraph" || child.type === "heading"
          );
          const cellAlign = firstBlock?.attrs?.textAlign as string | undefined;
          return new TableCell({
            columnSpan: colspan > 1 ? colspan : undefined,
            rowSpan: rowspan > 1 ? rowspan : undefined,
            shading: cellBg ? { fill: cellBg } : headerShade ? { fill: headerShade } : undefined,
            children: [
              new Paragraph({
                alignment: mapAlign(cellAlign, AlignmentType),
                children: [
                  new TextRun({
                    text: cellText.slice(0, 2000),
                    bold: cell.type === "tableHeader" || undefined,
                  }),
                ],
              }),
            ],
          });
        });
        return new TableRow({ children: cells.length > 0 ? cells : [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })] })] });
      });
      if (rows.length === 0) return null;
      // WHY: Mirror Phase B properties — alignment (+ auto width so it shows),
      // borderless gridlines, per-cell shading. Matches the app's rendering.
      const tableAlignment = node.attrs?.tableAlignment as string | undefined;
      const borderless = node.attrs?.borderless === true;
      const nilBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
      return new Table({
        rows,
        alignment:
          tableAlignment === "center"
            ? AlignmentType.CENTER
            : tableAlignment === "right"
              ? AlignmentType.RIGHT
              : undefined,
        width:
          tableAlignment === "center" || tableAlignment === "right"
            ? { size: 0, type: WidthType.AUTO }
            : undefined,
        borders: borderless
          ? {
              top: nilBorder,
              left: nilBorder,
              bottom: nilBorder,
              right: nilBorder,
              insideHorizontal: nilBorder,
              insideVertical: nilBorder,
            }
          : undefined,
      });
    }
    case "image": {
      const src = node.attrs?.src as string | undefined;
      if (!src) return null;
      const widthPct = imageWidthPercent(node.attrs?.width);
      if (src.startsWith("data:image/")) {
        try {
          const { data, type } = dataUrlToUint8(src);
          const box = docxImageBox(node.attrs, undefined);
          return new Paragraph({
            children: [
              new ImageRun({
                data,
                transformation: {
                  width: Math.round((box.width * widthPct) / 100),
                  height: Math.round((box.height * widthPct) / 100),
                },
                type,
              }),
            ],
          });
        } catch {
          return null;
        }
      }
      // WHY: docx never fetches — the app does (maintainer-confirmed pattern).
      // CORS-hostile URLs land in the skip list (toasted once after export).
      if (/^https?:\/\//i.test(src)) {
        const fetched = await fetchRemoteImageForDocx(src, imageContext.remoteCache);
        if (!fetched) {
          imageContext.skippedRemoteImages.add(src);
          return null;
        }
        const box = docxImageBox(node.attrs, { width: fetched.width, height: fetched.height });
        return new Paragraph({
          children: [
            new ImageRun({
              data: fetched.data,
              transformation: {
                width: Math.round((box.width * widthPct) / 100),
                height: Math.round((box.height * widthPct) / 100),
              },
              type: fetched.type,
            }),
          ],
        });
      }
      return null;
    }
    case "horizontalRule":
      // WHY: HR is the manual page-break marker — export a real Word page
      // break, not a decorative line, so Word paginates like the app.
      return new Paragraph({ children: [new PageBreak()] });
    default:
      if (node.text) {
        return new Paragraph({ children: runsFromInline([node], TextRun) });
      }
      return null;
  }
}

function runsFromInline(nodes: TipTapNode[], TextRun: new (opts: Record<string, unknown>) => unknown): unknown[] {
  const runs: unknown[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      runs.push(
        new TextRun({
          text: node.text ?? "",
          bold: hasMark(node, "bold"),
          italics: hasMark(node, "italic"),
          underline: hasMark(node, "underline") ? {} : undefined,
          strike: hasMark(node, "strike"),
          subScript: hasMark(node, "subscript"),
          superScript: hasMark(node, "superscript"),
          color: markAttr(node, "textStyle", "color"),
          size: fontSizeToHalfPoints(markAttr(node, "textStyle", "fontSize")),
        })
      );
    } else if (node.content) {
      // Flatten nested inline (e.g. paragraph inside listItem already handled; fallback here).
      runs.push(...runsFromInline(node.content, TextRun));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: "" })];
}

function collectInlineNodes(node: TipTapNode): TipTapNode[] {
  if (node.type === "paragraph" || node.type === "heading") return node.content ?? [];
  if (node.content && node.content.length === 1 && node.content[0].type === "paragraph") {
    return node.content[0].content ?? [];
  }
  return node.content ?? [];
}

function collectText(node: TipTapNode): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(collectText).join("");
}

function hasMark(node: TipTapNode, markType: string): boolean {
  return (node.marks ?? []).some((m) => m.type === markType);
}

function markAttr(node: TipTapNode, markType: string, key: string): string | undefined {
  const mark = (node.marks ?? []).find((m) => m.type === markType);
  const value = mark?.attrs?.[key] as string | undefined;
  return typeof value === "string" ? value.replace("#", "") : undefined;
}

function fontSizeToHalfPoints(fontSize?: string): number | undefined {
  if (!fontSize) return undefined;
  const px = parseInt(fontSize, 10);
  if (Number.isNaN(px)) return undefined;
  // 1px ≈ 0.75pt; docx size is half-points.
  return Math.round(px * 0.75 * 2);
}

// WHY: Cell fill from Phase B is stored as #rrggbb; DOCX shading wants bare hex.
function normalizeHexColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  return match ? match[1].toUpperCase() : undefined;
}

// WHY: Screen indent step is 36px ≈ 0.5in, so DOCX uses 720 twip per level to match.
function indentToDocx(indentAttr: unknown): { left: number } | undefined {
  const level = typeof indentAttr === "number" ? Math.round(indentAttr) : 0;
  if (!Number.isFinite(level) || level <= 0) return undefined;
  return { left: Math.min(7, level) * 720 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAlign(align: string | undefined, AlignmentType: any): unknown | undefined {
  switch (align) {
    case "center": return AlignmentType.CENTER;
    case "right": return AlignmentType.RIGHT;
    case "justify": return AlignmentType.JUSTIFIED;
    default: return undefined;
  }
}

function imageWidthPercent(widthAttr: unknown): number {
  return typeof widthAttr === "number" && Number.isFinite(widthAttr)
    ? Math.min(100, Math.max(10, Math.round(widthAttr)))
    : 100;
}

// WHY: Aspect-correct box — true pixels when known (uploads, fetched remotes),
// legacy box otherwise. Capped to page content width so wide panoramas fit.
function docxImageBox(
  attrs: Record<string, unknown> | undefined,
  intrinsic: { width?: number; height?: number } | undefined
): { width: number; height: number } {
  const naturalWidth = attrs?.naturalWidth;
  const naturalHeight = attrs?.naturalHeight;
  const baseWidth =
    typeof naturalWidth === "number" && Number.isFinite(naturalWidth) && naturalWidth > 0
      ? naturalWidth * 0.75
      : intrinsic?.width && intrinsic.width > 0
        ? intrinsic.width
        : LEGACY_IMAGE_BOX.width;
  const baseHeight =
    typeof naturalHeight === "number" && Number.isFinite(naturalHeight) && naturalHeight > 0
      ? naturalHeight * 0.75
      : intrinsic?.height && intrinsic.height > 0
        ? intrinsic.height
        : LEGACY_IMAGE_BOX.height;
  const fitScale = Math.min(1, MAX_DOCX_IMAGE_WIDTH_PT / Math.max(1, baseWidth));
  return {
    width: Math.max(1, Math.round(baseWidth * fitScale)),
    height: Math.max(1, Math.round(baseHeight * fitScale)),
  };
}

function docxImageType(mimeType: string | null, url: string): SupportedImageType | null {
  const byMime: Record<string, SupportedImageType> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/bmp": "bmp",
  };
  if (mimeType) {
    const fromMime = byMime[mimeType.split(";")[0].trim().toLowerCase()];
    if (fromMime) return fromMime;
  }
  const extension = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (extension === "png") return "png";
  if (extension === "jpg" || extension === "jpeg") return "jpg";
  if (extension === "gif") return "gif";
  if (extension === "bmp") return "bmp";
  // WHY: No webp/svg — Word can't reliably display them; they land in the skip list.
  return null;
}

// WHY: Fetch + decode with timeout, deduped per URL. Every failure mode
// (CORS, 404, timeout, unsupported type, oversize, undecodable) resolves to
// null so one bad image never aborts the whole export.
async function fetchRemoteImageForDocx(
  url: string,
  cache: Map<string, Promise<FetchedImage | null>>
): Promise<FetchedImage | null> {
  const cached = cache.get(url);
  if (cached) return cached;
  const task = (async (): Promise<FetchedImage | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      const type = docxImageType(response.headers.get("content-type"), url);
      if (!type) return null;
      const data = await response.arrayBuffer();
      if (data.byteLength === 0 || data.byteLength > 15_000_000) return null;
      let width: number | undefined;
      let height: number | undefined;
      try {
        const bitmap = await createImageBitmap(new Blob([data]));
        width = bitmap.width;
        height = bitmap.height;
        bitmap.close();
      } catch {
        // Dimensions stay undefined — legacy box applies.
      }
      return { data, type, width, height };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
  cache.set(url, task);
  return task;
}

function dataUrlToUint8(dataUrl: string): { data: Uint8Array; type: "png" | "jpg" | "gif" } {
  const match = /^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Unsupported image");
  const mime = match[2];
  const binary = atob(match[3]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { data: bytes, type: mime === "png" ? "png" : "jpg" };
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

function sanitizeFileName(title: string): string {
  return (title.trim() || "document").replace(/[\\/:*?"<>|]/g, "-").slice(0, 150);
}
