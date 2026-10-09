import { describe, expect, it } from "vitest";
import { docxImageSize } from "@/services/docxExportService";

// WHY: Height override must derive from the rendered width in the shared unit
// (no natural dims needed); null height keeps today's aspect math so untouched
// images export byte-identical.
describe("docxImageSize", () => {
  it("uses aspect math when height is not set", () => {
    expect(docxImageSize({ width: 400, height: 300 }, 50, null)).toEqual({ width: 200, height: 150 });
    expect(docxImageSize({ width: 400, height: 300 }, 50, undefined)).toEqual({ width: 200, height: 150 });
  });

  it("derives height from the override", () => {
    expect(docxImageSize({ width: 400, height: 300 }, 50, 60)).toEqual({ width: 200, height: 240 });
  });

  it("clamps the override to 5–300", () => {
    expect(docxImageSize({ width: 400, height: 400 }, 100, 500)).toEqual({ width: 400, height: 1200 });
  });

  it("falls back to aspect math on garbage height", () => {
    expect(docxImageSize({ width: 400, height: 300 }, 50, "tall")).toEqual({ width: 200, height: 150 });
  });
});
