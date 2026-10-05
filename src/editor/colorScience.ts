// WHY: Pure color math for the honeycomb inspector — conversions, WCAG 2.1
// contrast, radial harmonies, snap-to-closest, keyboard neighbor moves are
// already in honeycombWheel. Fully unit-tested with known reference values.

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number;
  s: number;
  v: number;
}

export interface CmykColor {
  c: number;
  m: number;
  y: number;
  k: number;
}

const HEX_PATTERN = /^#([0-9a-f]{6})$/i;

export function hexToRgb(hex: string): RgbColor | null {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) return null;
  return {
    r: Number.parseInt(match[1].slice(0, 2), 16),
    g: Number.parseInt(match[1].slice(2, 4), 16),
    b: Number.parseInt(match[1].slice(4, 6), 16),
  };
}

export function rgbToHex(red: number, green: number, blue: number): string {
  const toHex = (channel: number) =>
    Math.min(255, Math.max(0, Math.round(channel)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function rgbToHsv(red: number, green: number, blue: number): HsvColor {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return {
    h: Math.round(hue),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100),
  };
}

export function rgbToCmyk(red: number, green: number, blue: number): CmykColor {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const key = 1 - Math.max(r, g, b);
  if (key >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const toPercent = (channel: number) => Math.round(((1 - channel - key) / (1 - key)) * 100);
  return { c: toPercent(r), m: toPercent(g), y: toPercent(b), k: Math.round(key * 100) };
}

/** WCAG 2.1 relative luminance (0–1). */
export function relativeLuminance({ r, g, b }: RgbColor): number {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG 2.1 contrast ratio (1–21). */
export function contrastRatio(first: RgbColor, second: RgbColor): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagTag = "AAA" | "AA" | "FAIL";

/** Normal-text thresholds: AAA ≥ 7, AA ≥ 4.5. */
export function wcagTag(ratio: number): WcagTag {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "FAIL";
}

export type HarmonyKind = "complementary" | "triadic" | "analogous";

/** Hue offsets from the base angle. */
export function harmonyHues(hue: number, kind: HarmonyKind): number[] {
  const normalize = (value: number) => ((value % 360) + 360) % 360;
  switch (kind) {
    case "complementary":
      return [normalize(hue + 180)];
    case "triadic":
      return [normalize(hue + 120), normalize(hue + 240)];
    case "analogous":
      return [normalize(hue - 30), normalize(hue + 30)];
  }
}

/** Nearest cell by RGB Euclidean distance (powers hex input snapping). */
export function snapToClosestCell<TCELL extends { hex: string }>(
  cells: ReadonlyArray<TCELL>,
  hex: string
): TCELL | null {
  const target = hexToRgb(hex);
  if (!target) return null;
  let best: TCELL | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const cell of cells) {
    const candidate = hexToRgb(cell.hex);
    if (!candidate) continue;
    const distance =
      (candidate.r - target.r) ** 2 + (candidate.g - target.g) ** 2 + (candidate.b - target.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = cell;
    }
  }
  return best;
}

// WHY: CSS named colors as the human-readable vocabulary for hover tooltips.
// Names only (cell colors stay procedural) — nearest match by RGB distance.
const CSS_COLOR_NAMES: ReadonlyArray<readonly [string, string]> = [
  ["AliceBlue", "#F0F8FF"], ["AntiqueWhite", "#FAEBD7"], ["Aqua", "#00FFFF"],
  ["Aquamarine", "#7FFFD4"], ["Azure", "#F0FFFF"], ["Beige", "#F5F5DC"],
  ["Bisque", "#FFE4C4"], ["Black", "#000000"], ["BlanchedAlmond", "#FFEBCD"],
  ["Blue", "#0000FF"], ["BlueViolet", "#8A2BE2"], ["Brown", "#A52A2A"],
  ["BurlyWood", "#DEB887"], ["CadetBlue", "#5F9EA0"], ["Chartreuse", "#7FFF00"],
  ["Chocolate", "#D2691E"], ["Coral", "#FF7F50"], ["CornflowerBlue", "#6495ED"],
  ["Cornsilk", "#FFF8DC"], ["Crimson", "#DC143C"], ["Cyan", "#00FFFF"],
  ["DarkBlue", "#00008B"], ["DarkCyan", "#008B8B"], ["DarkGoldenRod", "#B8860B"],
  ["DarkGray", "#A9A9A9"], ["DarkGreen", "#006400"], ["DarkKhaki", "#BDB76B"],
  ["DarkMagenta", "#8B008B"], ["DarkOliveGreen", "#556B2F"], ["DarkOrange", "#FF8C00"],
  ["DarkOrchid", "#9932CC"], ["DarkRed", "#8B0000"], ["DarkSalmon", "#E9967A"],
  ["DarkSeaGreen", "#8FBC8F"], ["DarkSlateBlue", "#483D8B"], ["DarkSlateGray", "#2F4F4F"],
  ["DarkTurquoise", "#00CED1"], ["DarkViolet", "#9400D3"], ["DeepPink", "#FF1493"],
  ["DeepSkyBlue", "#00BFFF"], ["DimGray", "#696969"], ["DodgerBlue", "#1E90FF"],
  ["FireBrick", "#B22222"], ["FloralWhite", "#FFFAF0"], ["ForestGreen", "#228B22"],
  ["Fuchsia", "#FF00FF"], ["Gainsboro", "#DCDCDC"], ["GhostWhite", "#F8F8FF"],
  ["Gold", "#FFD700"], ["GoldenRod", "#DAA520"], ["Gray", "#808080"],
  ["Green", "#008000"], ["GreenYellow", "#ADFF2F"], ["HoneyDew", "#F0FFF0"],
  ["HotPink", "#FF69B4"], ["IndianRed", "#CD5C5C"], ["Indigo", "#4B0082"],
  ["Ivory", "#FFFFF0"], ["Khaki", "#F0E68C"], ["Lavender", "#E6E6FA"],
  ["LavenderBlush", "#FFF0F5"], ["LawnGreen", "#7CFC00"], ["LemonChiffon", "#FFFACD"],
  ["LightBlue", "#ADD8E6"], ["LightCoral", "#F08080"], ["LightCyan", "#E0FFFF"],
  ["LightGoldenRodYellow", "#FAFAD2"], ["LightGray", "#D3D3D3"], ["LightGreen", "#90EE90"],
  ["LightPink", "#FFB6C1"], ["LightSalmon", "#FFA07A"], ["LightSeaGreen", "#20B2AA"],
  ["LightSkyBlue", "#87CEFA"], ["LightSlateGray", "#778899"], ["LightSteelBlue", "#B0C4DE"],
  ["LightYellow", "#FFFFE0"], ["Lime", "#00FF00"], ["LimeGreen", "#32CD32"],
  ["Linen", "#FAF0E6"], ["Magenta", "#FF00FF"], ["Maroon", "#800000"],
  ["MediumAquaMarine", "#66CDAA"], ["MediumBlue", "#0000CD"], ["MediumOrchid", "#BA55D3"],
  ["MediumPurple", "#9370DB"], ["MediumSeaGreen", "#3CB371"], ["MediumSlateBlue", "#7B68EE"],
  ["MediumSpringGreen", "#00FA9A"], ["MediumTurquoise", "#48D1CC"], ["MediumVioletRed", "#C71585"],
  ["MidnightBlue", "#191970"], ["MintCream", "#F5FFFA"], ["MistyRose", "#FFE4E1"],
  ["Moccasin", "#FFE4B5"], ["NavajoWhite", "#FFDEAD"], ["Navy", "#000080"],
  ["OldLace", "#FDF5E6"], ["Olive", "#808000"], ["OliveDrab", "#6B8E23"],
  ["Orange", "#FFA500"], ["OrangeRed", "#FF4500"], ["Orchid", "#DA70D6"],
  ["PaleGoldenRod", "#EEE8AA"], ["PaleGreen", "#98FB98"], ["PaleTurquoise", "#AFEEEE"],
  ["PaleVioletRed", "#DB7093"], ["PapayaWhip", "#FFEFD5"], ["PeachPuff", "#FFDAB9"],
  ["Peru", "#CD853F"], ["Pink", "#FFC0CB"], ["Plum", "#DDA0DD"],
  ["PowderBlue", "#B0E0E6"], ["Purple", "#800080"], ["RebeccaPurple", "#663399"],
  ["Red", "#FF0000"], ["RosyBrown", "#BC8F8F"], ["RoyalBlue", "#4169E1"],
  ["SaddleBrown", "#8B4513"], ["Salmon", "#FA8072"], ["SandyBrown", "#F4A460"],
  ["SeaGreen", "#2E8B57"], ["SeaShell", "#FFF5EE"], ["Sienna", "#A0522D"],
  ["Silver", "#C0C0C0"], ["SkyBlue", "#87CEEB"], ["SlateBlue", "#6A5ACD"],
  ["SlateGray", "#708090"], ["Snow", "#FFFAFA"], ["SpringGreen", "#00FF7F"],
  ["SteelBlue", "#4682B4"], ["Tan", "#D2B48C"], ["Teal", "#008080"],
  ["Thistle", "#D8BFD8"], ["Tomato", "#FF6347"], ["Turquoise", "#40E0D0"],
  ["Violet", "#EE82EE"], ["Wheat", "#F5DEB3"], ["White", "#FFFFFF"],
  ["WhiteSmoke", "#F5F5F5"], ["Yellow", "#FFFF00"], ["YellowGreen", "#9ACD32"],
];

export function nearestColorName(hex: string): string | null {
  const target = hexToRgb(hex);
  if (!target) return null;
  let bestName: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [name, namedHex] of CSS_COLOR_NAMES) {
    const candidate = hexToRgb(namedHex);
    if (!candidate) continue;
    const distance =
      (candidate.r - target.r) ** 2 + (candidate.g - target.g) ** 2 + (candidate.b - target.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = name;
    }
  }
  return bestName;
}
