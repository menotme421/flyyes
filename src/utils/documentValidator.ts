// WHY: Validate ALL user input even though storage is local.
// Prevents oversized imports from crashing the browser and blocks script injection via titles.

const MAX_TITLE_LENGTH = 200;
const MAX_JSON_BYTES = 5_000_000; // ~5MB per doc keeps IndexedDB + export fast
const MAX_IMPORT_BYTES = 5_000_000;
const MAX_DOCX_BYTES = 15_000_000;

export function sanitizeTitle(rawTitle: string): string {
  // Strip control chars, trim, cap length. Titles render as plain text (never HTML).
  return rawTitle.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, MAX_TITLE_LENGTH);
}

export function validateNewTitle(rawTitle: string): { ok: boolean; cleanTitle: string; error?: string } {
  const cleanTitle = sanitizeTitle(rawTitle);
  if (cleanTitle.length === 0) {
    return { ok: false, cleanTitle: "", error: "Title cannot be empty." };
  }
  return { ok: true, cleanTitle };
}

export function isContentSizeSafe(contentJson: string): boolean {
  return new Blob([contentJson]).size <= MAX_JSON_BYTES;
}

export function isImportFileSafe(fileName: string, fileSize: number): { ok: boolean; error?: string } {
  const lowerName = fileName.toLowerCase();
  const isDocx = lowerName.endsWith(".docx");
  const allowed =
    lowerName.endsWith(".json") ||
    lowerName.endsWith(".html") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".markdown") ||
    isDocx;
  if (!allowed) {
    return { ok: false, error: "Import .json, .html, .md, or .docx files." };
  }
  const maxBytes = isDocx ? MAX_DOCX_BYTES : MAX_IMPORT_BYTES;
  if (fileSize <= 0 || fileSize > maxBytes) {
    return { ok: false, error: isDocx ? "File is empty or larger than 15MB." : "File is empty or larger than 5MB." };
  }
  return { ok: true };
}
