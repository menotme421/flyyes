// WHY: Pure functions (no DB) so they are trivially testable for edge cases:
// empty, very long, special chars — per project testing rules.

export function countWordsFromText(plainText: string): number {
  const trimmed = plainText.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

export function extractPlainTextFromHtml(html: string): string {
  // WHY: DOMParser (not regex) so pasted Word HTML cannot inject scripts here.
  // We read textContent only, scripts never execute.
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  return parsed.body.textContent ?? "";
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function createDocumentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `doc_${crypto.randomUUID()}`;
  }
  return `doc_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}
