import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  harmonyHues,
  hexToRgb,
  nearestColorName,
  rgbToCmyk,
  rgbToHex,
  rgbToHsv,
  snapToClosestCell,
  wcagTag,
} from "@/editor/colorScience";

// WHY: Inspector numbers must match reference colorimetry — conversions,
// WCAG ratios, and harmony angles are pinned to known values.
describe("hexToRgb / rgbToHex", () => {
  it("round-trips", () => {
    expect(hexToRgb("#3B82F6")).toEqual({ r: 59, g: 130, b: 246 });
    expect(rgbToHex(59, 130, 246)).toBe("#3B82F6");
    expect(hexToRgb("nope")).toBeNull();
    expect(hexToRgb("#FFF")).toBeNull();
  });
});

describe("rgbToHsv / rgbToCmyk", () => {
  it("converts red", () => {
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 100, v: 100 });
    expect(rgbToCmyk(255, 0, 0)).toEqual({ c: 0, m: 100, y: 100, k: 0 });
  });

  it("converts black and white", () => {
    expect(rgbToCmyk(0, 0, 0)).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    expect(rgbToCmyk(255, 255, 255)).toEqual({ c: 0, m: 0, y: 0, k: 0 });
  });
});

describe("contrastRatio / wcagTag", () => {
  it("scores black on white at 21", () => {
    const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeCloseTo(21, 1);
    expect(wcagTag(ratio)).toBe("AAA");
  });

  it("scores identical colors at 1 with FAIL", () => {
    const ratio = contrastRatio({ r: 200, g: 200, b: 200 }, { r: 200, g: 200, b: 200 });
    expect(ratio).toBeCloseTo(1, 9);
    expect(wcagTag(ratio)).toBe("FAIL");
  });

  it("tags mid ratios AA", () => {
    expect(wcagTag(4.6)).toBe("AA");
    expect(wcagTag(6.9)).toBe("AA");
  });
});

describe("harmonyHues", () => {
  it("derives complementary, triadic, and analogous angles", () => {
    expect(harmonyHues(0, "complementary")).toEqual([180]);
    expect(harmonyHues(0, "triadic")).toEqual([120, 240]);
    expect(harmonyHues(350, "analogous")).toEqual([320, 20]);
  });
});

describe("snapToClosestCell", () => {
  const cells = [{ hex: "#FF0000" }, { hex: "#00FF00" }, { hex: "#0000FF" }];

  it("snaps to the nearest cell", () => {
    expect(snapToClosestCell(cells, "#FE0102")).toEqual({ hex: "#FF0000" });
  });

  it("rejects invalid input", () => {
    expect(snapToClosestCell(cells, "nope")).toBeNull();
  });
});

describe("nearestColorName", () => {
  it("names primary colors", () => {
    expect(nearestColorName("#FF0000")).toBe("Red");
    expect(nearestColorName("#000000")).toBe("Black");
    expect(nearestColorName("#FFFFFF")).toBe("White");
  });

  it("rejects invalid input", () => {
    expect(nearestColorName("nope")).toBeNull();
  });
});
