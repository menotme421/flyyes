import { useState } from "react";
import { FileDown, FileJson, FileText, Globe, Printer } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@flyyes/ui";
import { exportDocumentAsHtml, exportDocumentAsJson } from "@/services/exportImportService";
import { DEFAULT_PAGE_MARGINS } from "@/services/pageSetupService";
import type { PageMargins } from "@/storage/documentTypes";
import { icon16 } from "./icon16";

// WHY: One Export entry point on a dropdown menu (focus + roles built in).
// JSON/HTML export instantly; Markdown/DOCX lazy-load heavy converters on click.
// Used in the edit toolbar and above the pages preview so both modes match.

interface ExportMenuProperties {
  documentTitle: string;
  contentJson: string;
  contentHtml: string;
  pageMargins?: PageMargins;
  paperSizeMm?: { widthMm: number; heightMm: number };
  onError: (message: string) => void;
}

// WHY: Radix renders renderIcon with no size — module consts pin 16.
const JsonIcon = icon16(FileJson);
const MarkdownIcon = icon16(FileText);
const DocxIcon = icon16(FileDown);
const HtmlIcon = icon16(Globe);
const PrintIcon = icon16(Printer);

type BusyFormat = "md" | "docx" | null;

export function ExportMenu({ documentTitle, contentJson, contentHtml, pageMargins = DEFAULT_PAGE_MARGINS, paperSizeMm, onError }: ExportMenuProperties) {
  const [busy, setBusy] = useState<BusyFormat>(null);

  async function handleMarkdown(): Promise<void> {
    setBusy("md");
    try {
      const { convertJsonToMarkdown, downloadMarkdownFile } = await import("@/services/markdownService");
      downloadMarkdownFile(documentTitle, convertJsonToMarkdown(contentJson));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Markdown export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDocx(): Promise<void> {
    setBusy("docx");
    try {
      const { exportJsonToDocx } = await import("@/services/docxExportService");
      await exportJsonToDocx(documentTitle, contentJson, pageMargins, paperSizeMm);
    } catch (error) {
      onError(error instanceof Error ? error.message : "DOCX export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
  // WHY: bottom-end anchoring — the trigger sits at the viewport's right
  // edge. Shortcut hints ride on the right via ml-auto.
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => exportDocumentAsJson(documentTitle, contentJson)}>
          <JsonIcon />
          JSON backup
          <span className="ml-auto text-xs text-muted-foreground">Full fidelity</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy !== null}
          onSelect={() => void handleMarkdown()}
        >
          <MarkdownIcon />
          {busy === "md" ? "Markdown…" : "Markdown"}
          <span className="ml-auto text-xs text-muted-foreground">Text, links, tables</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy !== null}
          onSelect={() => void handleDocx()}
        >
          <DocxIcon />
          {busy === "docx" ? "Word…" : "Word (.docx)"}
          <span className="ml-auto text-xs text-muted-foreground">Opens in Word</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportDocumentAsHtml(documentTitle, contentHtml)}>
          <HtmlIcon />
          Web page (.html)
          <span className="ml-auto text-xs text-muted-foreground">Share anywhere</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => window.setTimeout(() => window.print(), 150)}
        >
          <PrintIcon />
          Print / PDF
          <span className="ml-auto text-xs text-muted-foreground">Via browser</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
