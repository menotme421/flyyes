import { describe, expect, it } from "vitest";
import { clampImageWidthPct, parseImageWidth } from "@/editor/resizableImageExtension";

// WHY: Width persists in stored JSON and drives DOCX scaling — corrupt values
// must collapse to safe bounds instead of breaking layout or export.
describe("clampImageWidthPct", () => {
  it("passes normal values through", () => {
    expect(clampImageWidthPct(50)).toBe(50);
  });

  it("clamps to 10–100", () => {
    expect(clampImageWidthPct(0)).toBe(10);
    expect(clampImageWidthPct(250)).toBe(100);
  });

  it("falls back to full width on garbage", () => {
    expect(clampImageWidthPct(NaN)).toBe(100);
    expect(clampImageWidthPct(undefined)).toBe(100);
  });
});

describe("parseImageWidth", () => {
  it("accepts percent strings, bare numbers, and numbers", () => {
    expect(parseImageWidth("50%")).toBe(50);
    expect(parseImageWidth(" 75 ")).toBe(75);
    expect(parseImageWidth(30)).toBe(30);
  });

  it("rejects anything else", () => {
    expect(parseImageWidth("")).toBeNull();
    expect(parseImageWidth("auto")).toBeNull();
    expect(parseImageWidth("10px")).toBeNull();
    expect(parseImageWidth(null)).toBeNull();
  });
});
