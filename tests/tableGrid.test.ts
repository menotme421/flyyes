import { describe, expect, it } from "vitest";
import {
  clampGridSize,
  computeVisibleSize,
  GRID_INITIAL_COLS,
  GRID_INITIAL_ROWS,
  GRID_MAX_COLS,
  GRID_MAX_ROWS,
} from "@/editor/TableGridPicker";

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

// WHY: The grid starts at 10×10 and grows by one as the cursor touches the
// edge — visible size must stay in [initial, max] on each axis independently.
describe("computeVisibleSize", () => {
  it("shows the initial grid when nothing is hovered", () => {
    expect(computeVisibleSize(null)).toEqual({ cols: GRID_INITIAL_COLS, rows: GRID_INITIAL_ROWS });
  });

  it("keeps the initial grid for middle cells", () => {
    expect(computeVisibleSize({ cols: 4, rows: 3 })).toEqual({ cols: 10, rows: 10 });
  });

  it("grows one column at the right edge", () => {
    expect(computeVisibleSize({ cols: 10, rows: 5 })).toEqual({ cols: 11, rows: 10 });
  });

  it("grows one row at the bottom edge", () => {
    expect(computeVisibleSize({ cols: 5, rows: 10 })).toEqual({ cols: 10, rows: 11 });
  });

  it("grows both axes at the corner", () => {
    expect(computeVisibleSize({ cols: 10, rows: 10 })).toEqual({ cols: 11, rows: 11 });
  });

  it("caps at the maximum grid size", () => {
    expect(computeVisibleSize({ cols: 19, rows: 19 })).toEqual({ cols: 20, rows: 20 });
    expect(computeVisibleSize({ cols: 20, rows: 20 })).toEqual({ cols: 20, rows: 20 });
    expect(computeVisibleSize({ cols: 99, rows: 99 })).toEqual({
      cols: GRID_MAX_COLS,
      rows: GRID_MAX_ROWS,
    });
  });
});
