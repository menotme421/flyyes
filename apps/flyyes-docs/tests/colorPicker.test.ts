import { describe, expect, it } from "vitest";
import { hexToHsv, hsvToHex, normalizeHexInput } from "@/components/ColorPicker";

// WHY: Hex values flow into documents and DOCX shading — garbage must be
// rejected at the dialog, never stored.
describe("normalizeHexInput", () => {
  it("accepts 6-digit hex with or without hash", () => {
    expect(normalizeHexInput("#3B82F6")).toBe("#3b82f6");
    expect(normalizeHexInput("3B82F6")).toBe("#3b82f6");
  });

  it("expands 3-digit hex", () => {
    expect(normalizeHexInput("#abc")).toBe("#aabbcc");
    expect(normalizeHexInput("abc")).toBe("#aabbcc");
  });

  it("rejects everything else", () => {
    expect(normalizeHexInput("")).toBeNull();
    expect(normalizeHexInput("red")).toBeNull();
    expect(normalizeHexInput("rgb(1,2,3)")).toBeNull();
    expect(normalizeHexInput("#12345")).toBeNull();
    expect(normalizeHexInput("#gggggg")).toBeNull();
    expect(normalizeHexInput("javascript:alert(1)")).toBeNull();
  });
});

describe("hexToHsv", () => {
  it("converts primaries", () => {
    expect(hexToHsv("#ff0000")).toMatchObject({ h: 0, s: 100, v: 100 });
    expect(hexToHsv("#ffffff")).toMatchObject({ s: 0, v: 100 });
    expect(hexToHsv("#000000")).toMatchObject({ v: 0 });
  });

  it("rejects invalid input", () => {
    expect(hexToHsv("")).toBeNull();
    expect(hexToHsv("red")).toBeNull();
  });
});

describe("hsvToHex", () => {
  it("converts primaries", () => {
    expect(hsvToHex(0, 100, 100)).toBe("#ff0000");
    expect(hsvToHex(120, 100, 100)).toBe("#00ff00");
    expect(hsvToHex(240, 100, 100)).toBe("#0000ff");
  });

  it("clamps out-of-range channels", () => {
    expect(hsvToHex(500, 200, -20)).toBe(hsvToHex(140, 100, 0));
  });

  it("round-trips through hexToHsv", () => {
    for (const hex of ["#3b82f6", "#f4a8ff", "#020618", "#a65f00"]) {
      const parsed = hexToHsv(hex);
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(hsvToHex(parsed.h, parsed.s, parsed.v)).toBe(hex);
      }
    }
  });
});
