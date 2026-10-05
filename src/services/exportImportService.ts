import { sanitizeTitle } from "@/utils/documentValidator";

// WHY: Export is the backup story (no cloud sync, no import UI on Home).
// JSON keeps full fidelity, Markdown bridges devs/AI, HTML opens anywhere,
// DOCX opens in Word (see docxExportService). Per-doc Export menu only.

export function exportDocumentAsJson(title: string, contentJson: string): void {
  const blob = new Blob([contentJson], { type: "application/json" });
  downloadBlob(blob, `${sanitizeFileName(title)}.flyyes.json`);
}

export function exportDocumentAsHtml(title: string, contentHtml: string): void {
  const fullHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${contentHtml}</body></html>`;
  downloadBlob(new Blob([fullHtml], { type: "text/html" }), `${sanitizeFileName(title)}.html`);
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
  return (sanitizeTitle(title) || "document").replace(/[\\/:*?"<>|]/g, "-");
}

function escapeHtml(raw: string): string {
  return raw.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}
