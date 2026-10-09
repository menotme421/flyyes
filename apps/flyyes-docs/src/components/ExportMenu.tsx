import { useState } from "react";
import { Document, DocumentExport, Globe, Json, Printer } from "@carbon/icons-react";
import { MenuButton, MenuItem, MenuItemDivider } from "@carbon/react";
import { exportDocumentAsHtml, exportDocumentAsJson } from "@/services/exportImportService";
import { DEFAULT_PAGE_MARGINS } from "@/services/pageSetupService";
import type { PageMargins } from "@/storage/documentTypes";

// WHY: One Export entry point on Carbon MenuButton (focus + roles built in).
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
    // WHY: bottom-end anchoring — the trigger sits at the viewport's right
    // edge, so bottom-start would push the menu off-screen. (Default
    // "bottom" also force-squeezes the menu to the trigger's width.)
    <MenuButton kind="ghost" size="sm" label="Export" menuAlignment="bottom-end">
      <MenuItem
        label="JSON backup"
        shortcut="Full fidelity"
        renderIcon={Json}
        onClick={() => exportDocumentAsJson(documentTitle, contentJson)}
      />
      <MenuItem
        label={busy === "md" ? "Markdown…" : "Markdown"}
        shortcut="Text, links, tables"
        renderIcon={Document}
        disabled={busy !== null}
        onClick={() => void handleMarkdown()}
      />
      <MenuItem
        label={busy === "docx" ? "Word…" : "Word (.docx)"}
        shortcut="Opens in Word"
        renderIcon={DocumentExport}
        disabled={busy !== null}
        onClick={() => void handleDocx()}
      />
      <MenuItem
        label="Web page (.html)"
        shortcut="Share anywhere"
        renderIcon={Globe}
        onClick={() => exportDocumentAsHtml(documentTitle, contentHtml)}
      />
      <MenuItemDivider />
      <MenuItem
        label="Print / PDF"
        shortcut="Via browser"
        renderIcon={Printer}
        // WHY: Delay past the menu-close so the open menu isn't captured
        // in the print snapshot.
        onClick={() => window.setTimeout(() => window.print(), 150)}
      />
    </MenuButton>
  );
}
