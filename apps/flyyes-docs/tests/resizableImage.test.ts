import { describe, expect, it } from "vitest";
import {
  clampImageHeightPct,
  clampImageWidthPct,
  initialHeightPct,
  parseImageHeight,
  parseImageWidth,
  proportionalHeightForWidth,
  heightPctAfterDrag,
  widthPctAfterDrag,
} from "@/editor/resizableImageExtension";

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

// WHY: East corners drive width directly, west corners mirror the same delta —
// every visible handle must map to the stored width-%, never to a dead end.
describe("widthPctAfterDrag", () => {
  it("grows right / shrinks left on east corners", () => {
    expect(widthPctAfterDrag(50, 100, 1000, 1)).toBe(60);
    expect(widthPctAfterDrag(50, -100, 1000, 1)).toBe(40);
  });

  it("mirrors the delta on west corners", () => {
    expect(widthPctAfterDrag(50, 100, 1000, -1)).toBe(40);
    expect(widthPctAfterDrag(50, -100, 1000, -1)).toBe(60);
  });

  it("clamps at 10–100 from any corner", () => {
    expect(widthPctAfterDrag(95, 200, 1000, 1)).toBe(100);
    expect(widthPctAfterDrag(12, -200, 1000, 1)).toBe(10);
    expect(widthPctAfterDrag(95, -200, 1000, -1)).toBe(100);
    expect(widthPctAfterDrag(12, 200, 1000, -1)).toBe(10);
  });

  it("falls back to the clamped start on garbage geometry", () => {
    expect(widthPctAfterDrag(50, NaN, 1000, 1)).toBe(50);
    expect(widthPctAfterDrag(50, 100, 0, 1)).toBe(50);
    expect(widthPctAfterDrag(NaN, 100, 1000, -1)).toBe(100);
  });
});

// WHY: Height shares width's unit, with a taller cage (5–300) so infographics
// survive; garbage collapses instead of corrupting stored JSON.
describe("parseImageHeight", () => {
  it("accepts percent strings, bare numbers, and numbers", () => {
    expect(parseImageHeight("50%")).toBe(50);
    expect(parseImageHeight(" 75 ")).toBe(75);
    expect(parseImageHeight(30)).toBe(30);
  });

  it("clamps to 5–300", () => {
    expect(parseImageHeight(0)).toBe(5);
    expect(parseImageHeight(400)).toBe(300);
  });

  it("rejects anything else", () => {
    expect(parseImageHeight("")).toBeNull();
    expect(parseImageHeight("auto")).toBeNull();
    expect(parseImageHeight("10px")).toBeNull();
    expect(parseImageHeight(NaN)).toBeNull();
    expect(clampImageHeightPct(undefined)).toBe(100);
  });
});

// WHY: South grows downward, north mirrors — the same contract as width,
// rotated 90 degrees through the shared % unit.
describe("heightPctAfterDrag", () => {
  it("grows down / shrinks up on the south handle", () => {
    expect(heightPctAfterDrag(50, 100, 1000, 1)).toBe(60);
    expect(heightPctAfterDrag(50, -100, 1000, 1)).toBe(40);
  });

  it("mirrors the delta on the north handle", () => {
    expect(heightPctAfterDrag(50, 100, 1000, -1)).toBe(40);
    expect(heightPctAfterDrag(50, -100, 1000, -1)).toBe(60);
  });

  it("clamps at 5–300", () => {
    expect(heightPctAfterDrag(290, 200, 1000, 1)).toBe(300);
    expect(heightPctAfterDrag(8, -200, 1000, 1)).toBe(5);
  });

  it("falls back to the clamped start on garbage geometry", () => {
    expect(heightPctAfterDrag(50, NaN, 1000, 1)).toBe(50);
    expect(heightPctAfterDrag(50, 100, 0, -1)).toBe(50);
  });
});

// WHY: Corners preserve whatever ratio is on screen (natural or distorted) —
// a surprise snap back to natural would punish deliberate stretching.
describe("proportionalHeightForWidth", () => {
  it("scales height with width", () => {
    expect(proportionalHeightForWidth(50, 75, 60)).toBe(90);
  });

  it("preserves an already-distorted ratio", () => {
    expect(proportionalHeightForWidth(50, 30, 100)).toBe(60);
  });

  it("leaves aspect-locked images locked", () => {
    expect(proportionalHeightForWidth(50, null, 80)).toBeNull();
  });
});

// WHY: The first height drag must start from a real size — stored naturals
// (uploads), live pixels (remote URLs), else the gesture is ignored.
describe("initialHeightPct", () => {
  it("derives from stored naturals first", () => {
    expect(initialHeightPct(50, { width: 800, height: 600 }, { width: 1600, height: 1600 })).toBe(38);
  });

  it("falls back to measured pixels", () => {
    expect(initialHeightPct(50, null, { width: 800, height: 600 })).toBe(38);
  });

  it("returns null when no size is known", () => {
    expect(initialHeightPct(50, null, null)).toBeNull();
    expect(initialHeightPct(50, { width: 0, height: 600 }, null)).toBeNull();
  });
});
