// WHY: Procedural 127-cell spectral wheel (classic Office Colors dialog) —
// no palettes, no hardcoded colors. Pure axial geometry + HSL trigonometry,
// fully unit-tested. Screen coords (y down), pointy-top hexagons.

export interface HoneycombCell {
  id: string;
  /** Axial cube coords (q, r, s = -q-r). */
  q: number;
  r: number;
  /** max(|q|, |r|, |s|) — 0 for the center white cell. */
  ring: number;
  cx: number;
  cy: number;
  h: number;
  s: number;
  l: number;
  /** Uppercase #RRGGBB. */
  hex: string;
}

export const WHEEL_RING_COUNT = 6;
export const DEFAULT_CELL_RADIUS = 10.5;

/** Pointy-top hexagon vertices for center (cx, cy), radius s. */
export function hexPolygonPoints(cx: number, cy: number, radius: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    points.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
    );
  }
  return points.join(" ");
}

/** Standard HSL (h degrees, s/l percent) → uppercase #RRGGBB. */
export function hslToHex(hue: number, saturation: number, lightness: number): string {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = Math.min(100, Math.max(0, saturation)) / 100;
  const l = Math.min(100, Math.max(0, lightness)) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = h * 6;
  const mid = chroma * (1 - Math.abs((sector % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;
  if (sector < 1) { red = chroma; green = mid; }
  else if (sector < 2) { red = mid; green = chroma; }
  else if (sector < 3) { green = chroma; blue = mid; }
  else if (sector < 4) { green = mid; blue = chroma; }
  else if (sector < 5) { red = mid; blue = chroma; }
  else { red = chroma; blue = mid; }
  const lift = l - chroma / 2;
  const toHex = (channel: number) =>
    Math.round((channel + lift) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

/** Ring lightness ladder: pastels ramping to vivid primaries, then deep shades. */
export function ringLightness(ring: number): number {
  if (ring <= 0) return 100;
  if (ring <= 4) return 100 - (ring / 4) * 50;
  if (ring === 5) return 36;
  return 22;
}

/** Polar hue for a position (screen coords, y down). Center handled by caller. */
export function hueForPosition(x: number, y: number): number {
  const thetaDegrees = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return (thetaDegrees - 60 + 360) % 360;
}

export interface HoneycombLayout {
  cells: HoneycombCell[];
  /** Center-coordinate bounds (hex half-extents NOT included). */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** 13 rows (k = -6..+6), 7..13..7 cells = 127, every row centered on x = 0. */
export function buildHoneycomb(radius: number = DEFAULT_CELL_RADIUS): HoneycombLayout {
  const horizontalStep = Math.sqrt(3) * radius;
  const cells: HoneycombCell[] = [];
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let row = -WHEEL_RING_COUNT; row <= WHEEL_RING_COUNT; row++) {
    const colMin = Math.max(-WHEEL_RING_COUNT, -row - WHEEL_RING_COUNT);
    const colMax = Math.min(WHEEL_RING_COUNT, -row + WHEEL_RING_COUNT);
    for (let col = colMin; col <= colMax; col++) {
      const depth = -col - row;
      const ring = Math.max(Math.abs(col), Math.abs(row), Math.abs(depth));
      const cx = horizontalStep * (col + row / 2);
      const cy = radius * 1.5 * row;
      const h = ring === 0 ? 0 : hueForPosition(cx, cy);
      const s = ring === 0 ? 0 : 100;
      const l = ringLightness(ring);
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
      cells.push({
        id: `c${col},${row}`,
        q: col,
        r: row,
        ring,
        cx,
        cy,
        h,
        s,
        l,
        hex: hslToHex(h, s, l),
      });
    }
  }

  return { cells, minX, maxX, minY, maxY };
}

export interface GrayCell {
  id: string;
  cx: number;
  cy: number;
  hex: string;
  lightness: number;
}

/** 15 staggered grays (8 over 7) for beneath the wheel, L 94% → 0%, S 0%. */
export function buildGrayscale(radius: number, topRowY: number, centerX: number = 0): GrayCell[] {
  const horizontalStep = Math.sqrt(3) * radius;
  const cells: GrayCell[] = [];
  const rowSizes = [8, 7];
  let index = 0;
  rowSizes.forEach((count, rowIndex) => {
    for (let i = 0; i < count; i++) {
      const lightness = 94 - index * (94 / 14);
      cells.push({
        id: `g${index}`,
        cx: centerX + (i - (count - 1) / 2) * horizontalStep,
        cy: topRowY + rowIndex * 1.5 * radius,
        hex: hslToHex(0, 0, lightness),
        lightness,
      });
      index++;
    }
  });
  return cells;
}

/** Neighboring cell id in a screen direction (for arrow-key navigation). */
export function neighborInDirection(
  cells: ReadonlyArray<{ id: string; cx: number; cy: number }>,
  currentId: string,
  direction: "up" | "down" | "left" | "right"
): string | null {
  const current = cells.find((cell) => cell.id === currentId);
  if (!current) return null;
  const vectors = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const vector = vectors[direction];
  let bestId: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const cell of cells) {
    if (cell.id === currentId) continue;
    const dx = cell.cx - current.cx;
    const dy = cell.cy - current.cy;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) continue;
    const alignment = (dx * vector.x + dy * vector.y) / distance;
    // WHY: Must point mostly that way (cos > 0.5 ≈ within 60°), then nearest wins.
    if (alignment <= 0.5) continue;
    const score = distance / alignment;
    if (score < bestScore) {
      bestScore = score;
      bestId = cell.id;
    }
  }
  return bestId;
}
