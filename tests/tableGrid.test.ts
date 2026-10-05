import { describe, expect, it } from "vitest";
import { clampGridSize, GRID_MAX_COLS, GRID_MAX_ROWS } from "@/editor/TableGridPicker";

// WHY: Grid picker feeds rows/cols straight into insertTable — out-of-range
// values must never reach the editor (huge tables freeze the page).
describe("clampGridSize", () => {
  it("passes normal sizes through", () => {
    expect(clampGridSize(4, 3)).toEqual({ cols: 4, rows: 3 });
  });

  it("clamps to 1×1 minimum", () => {
    expect(clampGridSize(0, -2)).toEqual({ cols: 1, rows: 1 });
  });

  it("clamps to the Word-style grid maximum", () => {
    expect(clampGridSize(99, 99)).toEqual({ cols: GRID_MAX_COLS, rows: GRID_MAX_ROWS });
  });

  it("rejects non-numbers safely", () => {
    expect(clampGridSize(NaN, Number.POSITIVE_INFINITY)).toEqual({ cols: 1, rows: 1 });
  });
});
