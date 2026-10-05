import { useState } from "react";
import { Download, FileJson, FileText, FileType, Globe, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportDocumentAsHtml, exportDocumentAsJson } from "@/services/exportImportService";
import { DEFAULT_PAGE_MARGINS } from "@/services/pageSetupService";
import type { PageMargins } from "@/storage/documentTypes";

// WHY: One Export entry point on shadcn DropdownMenu (Radix focus + roles).
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Export document">
          <Download /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Export document</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ExportItem
          icon={<FileJson className="h-4 w-4" />}
          label="JSON backup"
          hint="Full fidelity"
          onSelect={() => exportDocumentAsJson(documentTitle, contentJson)}
        />
          <ExportItem
            icon={<FileText className="h-4 w-4" />}
            label={busy === "md" ? "Markdown…" : "Markdown"}
            hint="Text, links, tables"
            disabled={busy !== null}
            onSelect={() => void handleMarkdown()}
          />
        <ExportItem
          icon={<FileType className="h-4 w-4" />}
          label={busy === "docx" ? "Word…" : "Word (.docx)"}
          hint="Opens in Word"
          disabled={busy !== null}
          onSelect={() => void handleDocx()}
        />
        <ExportItem
          icon={<Globe className="h-4 w-4" />}
          label="Web page (.html)"
          hint="Share anywhere"
          onSelect={() => exportDocumentAsHtml(documentTitle, contentHtml)}
        />
        <DropdownMenuSeparator />
          <ExportItem
            icon={<Printer className="h-4 w-4" />}
            label="Print / PDF"
            hint="Via browser"
            // WHY: Delay past the menu-close so the open dropdown isn't captured
            // in the print snapshot (Radix closes async on select).
            onSelect={() => window.setTimeout(() => window.print(), 150)}
          />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ExportItem({ icon, label, hint, disabled, onSelect }: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem disabled={disabled} onSelect={onSelect} className="gap-2">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex-1 whitespace-nowrap">{label}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{hint}</span>
    </DropdownMenuItem>
  );
}
