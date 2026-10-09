import { describe, expect, it } from "vitest";
import { countWordsFromText } from "@/utils/textStatistics";

// WHY: Word count drives list metadata — must handle edge cases from project rules.
describe("textStatistics", () => {
  it("counts empty input as zero", () => {
    expect(countWordsFromText("")).toBe(0);
    expect(countWordsFromText("   \n\t  ")).toBe(0);
  });

  it("counts normal sentences", () => {
    expect(countWordsFromText("hello world")).toBe(2);
  });

  it("handles extremely long input", () => {
    expect(countWordsFromText("word ".repeat(10_000).trim())).toBe(10_000);
  });

  it("handles special characters and concurrent-like spacing", () => {
    expect(countWordsFromText("  hello,\tworld!\nnew   line  ")).toBe(4);
  });
});
