import { describe, expect, it } from "vitest";
import {
  normalizeBorderless,
  normalizeCellBackground,
  normalizeTableAlignment,
  normalizeVerticalAlignment,
} from "@/editor/tablePropertiesExtension";

// WHY: Styling attrs flow into HTML, preview CSS, and DOCX — unvalidated values
// (especially pasted rgb()/named colors) must never reach the document JSON.
describe("table property normalizers", () => {
  it("accepts hex fills from our color inputs", () => {
    expect(normalizeCellBackground("#ff0000")).toBe("#ff0000");
    expect(normalizeCellBackground("#ABC")).toBe("#abc");
  });

  it("rejects non-hex fills from pastes", () => {
    expect(normalizeCellBackground("rgb(255, 0, 0)")).toBeNull();
    expect(normalizeCellBackground("red")).toBeNull();
    expect(normalizeCellBackground("javascript:alert(1)")).toBeNull();
    expect(normalizeCellBackground(null)).toBeNull();
  });

  it("accepts only known alignments", () => {
    expect(normalizeTableAlignment("center")).toBe("center");
    expect(normalizeTableAlignment("right")).toBe("right");
    expect(normalizeTableAlignment("left")).toBe("left");
    expect(normalizeTableAlignment("justify")).toBeNull();
    expect(normalizeTableAlignment(undefined)).toBeNull();
  });

  it("accepts only known vertical alignments", () => {
    expect(normalizeVerticalAlignment("top")).toBe("top");
    expect(normalizeVerticalAlignment("middle")).toBe("middle");
    expect(normalizeVerticalAlignment("bottom")).toBe("bottom");
    expect(normalizeVerticalAlignment("baseline")).toBeNull();
    expect(normalizeVerticalAlignment(undefined)).toBeNull();
  });

  it("treats borderless as strictly boolean", () => {
    expect(normalizeBorderless(true)).toBe(true);
    expect(normalizeBorderless("true")).toBe(false);
    expect(normalizeBorderless(undefined)).toBe(false);
  });
});
