import { describe, expect, it } from "vitest";
import {
  buildAtPageCss,
  clampMargins,
  cmToPx,
  cmToTwip,
  contentHeightPx,
  DEFAULT_PAGE_MARGINS,
  DEFAULT_PRESET_ID,
  describeContentArea,
  mmToPx,
  PAGE_PRESETS,
  resolveMargins,
  resolvePageSetup,
} from "@/services/pageSetupService";

// WHY: Margins drive edit padding, preview, and DOCX — wrong math would
// silently break all three, so the pure converters are pinned by tests.
describe("pageSetupService", () => {
  it("converts 1 inch correctly", () => {
    expect(cmToPx(2.54)).toBe(96);
    expect(cmToTwip(2.54)).toBe(1440);
  });

  it("clamps each side independently", () => {
    const clamped = clampMargins({ topCm: 99, rightCm: -5, bottomCm: NaN, leftCm: 2 });
    expect(clamped.topCm).toBe(8);
    expect(clamped.rightCm).toBe(0);
    expect(clamped.bottomCm).toBe(DEFAULT_PAGE_MARGINS.bottomCm);
    expect(clamped.leftCm).toBe(2);
  });

  it("resolves legacy docs without margins to defaults", () => {
    expect(resolveMargins(undefined)).toEqual(DEFAULT_PAGE_MARGINS);
    expect(resolveMargins(null)).toEqual(DEFAULT_PAGE_MARGINS);
  });

  it("describes the A4 content area", () => {
    expect(describeContentArea(DEFAULT_PAGE_MARGINS)).toContain("16.0");
  });

  it("converts paper millimeters to screen pixels", () => {
    expect(mmToPx(25.4)).toBe(96);
    expect(mmToPx(210)).toBe(794);
    expect(mmToPx(297)).toBe(1123);
    expect(mmToPx(215.9)).toBe(816);
    expect(mmToPx(355.6)).toBe(1344);
  });

  it("resolves the default preset to A4 geometry", () => {
    const setup = resolvePageSetup(DEFAULT_PRESET_ID, null);
    expect(setup.paperWidthPx).toBe(794);
    expect(setup.paperHeightPx).toBe(1123);
    expect(setup.margins.topCm).toBe(2.54);
  });

  it("swaps paper dimensions for landscape presets", () => {
    const setup = resolvePageSetup("a4-standard", null, "landscape");
    expect(setup.landscape).toBe(true);
    expect(setup.paperWidthPx).toBe(1123);
    expect(setup.paperHeightPx).toBe(794);
  });

  it("maps the retired a4-landscape id to standard paper in landscape", () => {
    const setup = resolvePageSetup("a4-landscape", null);
    expect(setup.presetId).toBe("a4-standard");
    expect(setup.landscape).toBe(true);
    expect(setup.paperWidthPx).toBe(1123);
    expect(setup.margins.topCm).toBe(2.54);
  });

  it("honors legacy margins on A4 so old docs never re-paginate", () => {
    const legacy = { topCm: 2, rightCm: 2, bottomCm: 2, leftCm: 2 };
    const setup = resolvePageSetup("no-such-preset", legacy);
    expect(setup.margins).toEqual(legacy);
    expect(setup.paperWidthPx).toBe(794);
  });

  it("falls back to legacy 2.5cm defaults when nothing is stored", () => {
    const setup = resolvePageSetup(undefined, undefined);
    expect(setup.margins).toEqual(DEFAULT_PAGE_MARGINS);
    expect(setup.paperWidthPx).toBe(794);
  });

  it("derives content height from paper minus margins", () => {
    const setup = resolvePageSetup("a4-standard", null);
    expect(contentHeightPx(setup)).toBe(1123 - 96 - 96);
  });

  it("builds a matching @page rule for print", () => {
    const css = buildAtPageCss(resolvePageSetup("letter-standard", null));
    expect(css).toContain("size:215.9mm 279.4mm");
    expect(css).toContain("margin:2.54cm 2.54cm 2.54cm 2.54cm");
  });

  it("ships presets grouped by paper with use cases", () => {
    expect(PAGE_PRESETS).toHaveLength(6);
    for (const preset of PAGE_PRESETS) {
      expect(preset.paperLabel.length).toBeGreaterThan(0);
      expect(preset.useCases.length).toBeGreaterThanOrEqual(1);
    }
  });
});
