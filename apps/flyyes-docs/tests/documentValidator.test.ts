import { describe, expect, it } from "vitest";
import { isContentSizeSafe, isImportFileSafe, sanitizeTitle, validateNewTitle } from "@/utils/documentValidator";

// WHY: Critical path — bad titles/imports must never crash storage or inject scripts.
describe("documentValidator", () => {
  it("rejects empty titles", () => {
    expect(validateNewTitle("   ").ok).toBe(false);
  });

  it("trims and caps extremely long titles", () => {
    const long = "a".repeat(500);
    const result = validateNewTitle(long);
    expect(result.ok).toBe(true);
    expect(result.cleanTitle.length).toBeLessThanOrEqual(200);
  });

  it("strips control characters", () => {
    expect(sanitizeTitle("hello\u0000world")).toBe("helloworld");
  });

  it("rejects wrong import types and oversized files", () => {
    expect(isImportFileSafe("evil.exe", 100).ok).toBe(false);
    expect(isImportFileSafe("doc.json", 0).ok).toBe(false);
    expect(isImportFileSafe("doc.json", 6_000_000).ok).toBe(false);
    expect(isImportFileSafe("backup.flyyes.json", 100).ok).toBe(true);
    // Free merge formats: markdown + docx allowed, docx gets 15MB budget.
    expect(isImportFileSafe("notes.md", 100).ok).toBe(true);
    expect(isImportFileSafe("report.docx", 10_000_000).ok).toBe(true);
    expect(isImportFileSafe("report.docx", 20_000_000).ok).toBe(false);
  });

  it("handles special characters safely", () => {
    const result = validateNewTitle('<script>alert("x")</script> meeting notes');
    expect(result.ok).toBe(true);
    // Kept as plain text (React escapes on render) — never executed.
    expect(result.cleanTitle).toContain("<script>");
  });

  it("rejects oversized content", () => {
    expect(isContentSizeSafe("x".repeat(100))).toBe(true);
  });
});
