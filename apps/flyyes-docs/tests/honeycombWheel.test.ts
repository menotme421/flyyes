import { describe, expect, it } from "vitest";
import {
  buildHoneycomb,
  buildGrayscale,
  DEFAULT_CELL_RADIUS,
  hexPolygonPoints,
  hslToHex,
  hueForPosition,
  neighborInDirection,
  ringLightness,
  WHEEL_RING_COUNT,
} from "@/editor/honeycombWheel";

// WHY: The 127-cell wheel is generated math — pin counts, geometry constants,
// and the lightness ladder so regressions show up as test failures, not dots.
describe("buildHoneycomb", () => {
  it("builds 127 cells in rows 7 to 13 to 7", () => {
    const layout = buildHoneycomb();
    expect(layout.cells.length).toBe(127);
    expect(WHEEL_RING_COUNT).toBe(6);
    const rowSizes = new Map<number, number>();
    for (const cell of layout.cells) {
      rowSizes.set(cell.r, (rowSizes.get(cell.r) ?? 0) + 1);
    }
    expect([...rowSizes.entries()].sort((a, b) => a[0] - b[0]).map(([, size]) => size)).toEqual(
      [7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8, 7]
    );
  });

  it("centers every row on x = 0 with correct spacing", () => {
    const radius = DEFAULT_CELL_RADIUS;
    const layout = buildHoneycomb(radius);
    const horizontalStep = Math.sqrt(3) * radius;
    for (let row = -6; row <= 6; row++) {
      const rowCells = layout.cells.filter((cell) => cell.r === row).map((cell) => cell.cx);
      const midpoint = (Math.min(...rowCells) + Math.max(...rowCells)) / 2;
      expect(Math.abs(midpoint)).toBeLessThan(1e-9);
      const sorted = [...rowCells].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i] - sorted[i - 1]).toBeCloseTo(horizontalStep, 9);
      }
    }
    expect(layout.maxY - layout.minY).toBeCloseTo(18 * radius, 9);
  });

  it("assigns ring as axial distance with white center", () => {
    const layout = buildHoneycomb();
    const center = layout.cells.find((cell) => cell.q === 0 && cell.r === 0);
    expect(center?.ring).toBe(0);
    expect(center?.hex).toBe("#FFFFFF");
    const outer = layout.cells.filter((cell) => cell.ring === 6);
    expect(outer.length).toBeGreaterThan(0);
    for (const cell of layout.cells) {
      const expected = Math.max(Math.abs(cell.q), Math.abs(cell.r), Math.abs(cell.q + cell.r));
      expect(cell.ring).toBe(expected);
    }
  });
});

describe("ringLightness", () => {
  it("ramps pastels down to vivid primaries then deep shades", () => {
    expect(ringLightness(0)).toBe(100);
    expect(ringLightness(1)).toBe(87.5);
    expect(ringLightness(2)).toBe(75);
    expect(ringLightness(3)).toBe(62.5);
    expect(ringLightness(4)).toBe(50);
    expect(ringLightness(5)).toBe(36);
    expect(ringLightness(6)).toBe(22);
  });
});

describe("hueForPosition", () => {
  it("maps bottom-right to red per spec", () => {
    const angle = Math.PI / 3;
    expect(hueForPosition(Math.cos(angle), Math.sin(angle))).toBeCloseTo(0, 9);
  });

  it("maps bottom to orange and left to green", () => {
    expect(hueForPosition(0, 1)).toBeCloseTo(30, 9);
    expect(hueForPosition(-1, 0)).toBeCloseTo(120, 9);
  });
});

describe("hslToHex", () => {
  it("converts known colors to uppercase HEX", () => {
    expect(hslToHex(0, 100, 50)).toBe("#FF0000");
    expect(hslToHex(0, 0, 100)).toBe("#FFFFFF");
    expect(hslToHex(0, 0, 0)).toBe("#000000");
    expect(hslToHex(120, 100, 25)).toBe("#008000");
  });
});

describe("hexPolygonPoints", () => {
  it("emits six pointy-top vertices", () => {
    const points = hexPolygonPoints(0, 0, 10).split(" ");
    expect(points.length).toBe(6);
    // First vertex at -30° (top-right of pointy top).
    const [x, y] = points[0].split(",").map(Number);
    expect(x).toBeCloseTo(10 * Math.cos((-30 * Math.PI) / 180), 2);
    expect(y).toBeCloseTo(10 * Math.sin((-30 * Math.PI) / 180), 2);
  });
});

describe("buildGrayscale", () => {
  it("builds 15 cells across 8 over 7 rows from L94 to black", () => {
    const grays = buildGrayscale(10, 200);
    expect(grays.length).toBe(15);
    expect(grays[0].lightness).toBeCloseTo(94, 9);
    expect(grays[14].lightness).toBeCloseTo(0, 9);
    expect(grays[0].hex).not.toBe(grays[14].hex);
  });
});

describe("neighborInDirection", () => {
  const cells = [
    { id: "center", cx: 0, cy: 0 },
    { id: "right", cx: 10, cy: 0 },
    { id: "left", cx: -10, cy: 0 },
    { id: "down", cx: 0, cy: 10 },
    { id: "up", cx: 0, cy: -10 },
  ];

  it("moves to the nearest cell in each screen direction", () => {
    expect(neighborInDirection(cells, "center", "right")).toBe("right");
    expect(neighborInDirection(cells, "center", "left")).toBe("left");
    expect(neighborInDirection(cells, "center", "down")).toBe("down");
    expect(neighborInDirection(cells, "center", "up")).toBe("up");
  });

  it("returns null with no candidate or unknown id", () => {
    expect(neighborInDirection([{ id: "only", cx: 0, cy: 0 }], "only", "right")).toBeNull();
    expect(neighborInDirection(cells, "missing", "right")).toBeNull();
  });
});
