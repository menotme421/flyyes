import type { PageMargins, PageOrientation } from "@/storage/documentTypes";

// WHY: All margin math lives here so edit page, preview, print description,
// and DOCX export agree on one conversion. Pure functions = trivially testable.

// Word/Google Docs default: 1 inch ≈ 2.54cm. We use flat 2.5cm (visually identical, friendlier to type).
export const DEFAULT_PAGE_MARGINS: PageMargins = { topCm: 2.5, rightCm: 2.5, bottomCm: 2.5, leftCm: 2.5 };

export const MIN_MARGIN_CM = 0;
export const MAX_MARGIN_CM = 8;

export const PX_PER_CM = 96 / 2.54;
export const TWIP_PER_CM = 567; // Word unit: 1/1440 inch
export const PX_PER_MM = 96 / 25.4;
export const TWIP_PER_MM = 1440 / 25.4;

export function cmToPx(cm: number): number {
  return Math.round(cm * PX_PER_CM);
}

export function cmToTwip(cm: number): number {
  return Math.round(cm * TWIP_PER_CM);
}

export function mmToPx(mm: number): number {
  return Math.round(mm * PX_PER_MM);
}

export function mmToTwip(mm: number): number {
  return Math.round(mm * TWIP_PER_MM);
}

function clampNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_MARGIN_CM, Math.max(MIN_MARGIN_CM, value));
}

// WHY: Clamp each side independently so one bad field can't wipe the other three.
export function clampMargins(margins: PageMargins): PageMargins {
  return {
    topCm: clampNumber(margins.topCm, DEFAULT_PAGE_MARGINS.topCm),
    rightCm: clampNumber(margins.rightCm, DEFAULT_PAGE_MARGINS.rightCm),
    bottomCm: clampNumber(margins.bottomCm, DEFAULT_PAGE_MARGINS.bottomCm),
    leftCm: clampNumber(margins.leftCm, DEFAULT_PAGE_MARGINS.leftCm),
  };
}

// WHY: Legacy docs have no pageMargins field — resolve to defaults per side.
export function resolveMargins(input: PageMargins | undefined | null): PageMargins {
  if (!input) return { ...DEFAULT_PAGE_MARGINS };
  return clampMargins({
    topCm: Number(input.topCm),
    rightCm: Number(input.rightCm),
    bottomCm: Number(input.bottomCm),
    leftCm: Number(input.leftCm),
  });
}

// Friendly "Content: 16.0 × 24.7 cm" line for the Page Setup dialog.
export function describeContentArea(margins: PageMargins): string {
  const width = Math.max(0, 21 - margins.leftCm - margins.rightCm);
  const height = Math.max(0, 29.7 - margins.topCm - margins.bottomCm);
  return `Content: ${width.toFixed(1)} × ${height.toFixed(1)} cm on A4`;
}

// ---------------------------------------------------------------------------
// Preset-driven page setup: one pick sets paper + orientation + margins.
// Grouped by paper size in the dialog; each entry carries a use-case line so
// non-Word-users never have to learn what "2.54cm" means. No Custom entry:
// fixed presets only (keeps the dialog to one tap).
// ---------------------------------------------------------------------------

export interface PaperPreset {
  id: string;
  /** Paper group label shown in the dialog ("A4", "US Letter", ...). */
  paperLabel: string;
  /** Entry name ("Standard", "Compact", ...). */
  name: string;
  /** Use-case bullets shown under the name (count varies per preset). */
  useCases: readonly string[];
  widthMm: number;
  heightMm: number;
  margins: PageMargins;
}

export const PAGE_PRESETS: readonly PaperPreset[] = [
  {
    id: "a4-standard",
    paperLabel: "A4 · 210 × 297 mm",
    name: "Standard",
    useCases: ["Everyday documents", "Homework and assignments"],
    widthMm: 210,
    heightMm: 297,
    margins: { topCm: 2.54, rightCm: 2.54, bottomCm: 2.54, leftCm: 2.54 },
  },
  {
    id: "a4-compact",
    paperLabel: "A4 · 210 × 297 mm",
    name: "Compact",
    useCases: ["Dense content", "Fit more on each page"],
    widthMm: 210,
    heightMm: 297,
    margins: { topCm: 1.27, rightCm: 1.27, bottomCm: 1.27, leftCm: 1.27 },
  },
  {
    id: "a4-thesis",
    paperLabel: "A4 · 210 × 297 mm",
    name: "Thesis binding",
    useCases: ["Theses and dissertations", "Documents headed for binding"],
    widthMm: 210,
    heightMm: 297,
    margins: { topCm: 2.5, rightCm: 2.5, bottomCm: 2.5, leftCm: 3.5 },
  },
  {
    id: "letter-standard",
    paperLabel: "US Letter · 8.5 × 11 in",
    name: "Standard",
    useCases: ["US schools and workplaces"],
    widthMm: 215.9,
    heightMm: 279.4,
    margins: { topCm: 2.54, rightCm: 2.54, bottomCm: 2.54, leftCm: 2.54 },
  },
  {
    id: "legal-standard",
    paperLabel: "Legal · 8.5 × 14 in",
    name: "Standard",
    useCases: ["Contracts", "Legal filings"],
    widthMm: 215.9,
    heightMm: 355.6,
    margins: { topCm: 2.54, rightCm: 2.54, bottomCm: 2.54, leftCm: 2.54 },
  },
  {
    id: "a5-standard",
    paperLabel: "A5 · 148 × 210 mm",
    name: "Standard",
    useCases: ["Booklets", "Portable prints"],
    widthMm: 148,
    heightMm: 210,
    margins: { topCm: 1.5, rightCm: 1.5, bottomCm: 1.5, leftCm: 1.5 },
  },
];

export const DEFAULT_PRESET_ID = "a4-standard";

export function findPreset(presetId: string | undefined | null): PaperPreset | null {
  if (!presetId) return null;
  return PAGE_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

/** Fully resolved geometry every consumer (edit, preview, print, DOCX) shares. */
export interface ResolvedPageSetup {
  presetId: string;
  paperLabel: string;
  presetName: string;
  landscape: boolean;
  /** Paper size AFTER orientation, in mm. */
  paperWidthMm: number;
  paperHeightMm: number;
  /** Paper size AFTER orientation, in screen px (96dpi). */
  paperWidthPx: number;
  paperHeightPx: number;
  margins: PageMargins;
}

function marginsEqual(first: PageMargins, second: PageMargins): boolean {
  return (
    first.topCm === second.topCm &&
    first.rightCm === second.rightCm &&
    first.bottomCm === second.bottomCm &&
    first.leftCm === second.leftCm
  );
}

/**
 * Resolve stored fields to usable geometry. Precedence:
 * 1. Known presetId → that preset's paper + margins, composed with the
 *    stored orientation (legacy "a4-landscape" ids map to A4 standard +
 *    landscape, so those docs keep their exact layout).
 * 2. Legacy pageMargins (pre-preset docs) → honored as-is on A4 paper, so no
 *    existing document ever re-paginates; the dialog highlights the default
 *    preset until the user picks one.
 * 3. Nothing stored → A4 paper + legacy 2.5cm defaults (exactly today's behavior).
 */
export function resolvePageSetup(
  presetId: string | undefined | null,
  legacyMargins: PageMargins | undefined | null,
  orientation?: PageOrientation | undefined | null
): ResolvedPageSetup {
  let resolvedId = presetId;
  let resolvedOrientation: PageOrientation = orientation === "landscape" ? "landscape" : "portrait";
  if (resolvedId === "a4-landscape") {
    resolvedId = "a4-standard";
    resolvedOrientation = "landscape";
  }
  const preset = findPreset(resolvedId);
  if (preset) return applyPreset(preset, resolvedOrientation);
  const margins = legacyMargins ? clampMargins({ ...legacyMargins }) : { ...DEFAULT_PAGE_MARGINS };
  const matched = PAGE_PRESETS.find((candidate) => marginsEqual(candidate.margins, margins));
  return {
    presetId: matched?.id ?? DEFAULT_PRESET_ID,
    paperLabel: "A4 · 210 × 297 mm",
    presetName: matched?.name ?? "Standard",
    landscape: false,
    paperWidthMm: 210,
    paperHeightMm: 297,
    paperWidthPx: mmToPx(210),
    paperHeightPx: mmToPx(297),
    margins,
  };
}

function applyPreset(preset: PaperPreset, orientation: PageOrientation): ResolvedPageSetup {
  const landscape = orientation === "landscape";
  const paperWidthMm = landscape ? preset.heightMm : preset.widthMm;
  const paperHeightMm = landscape ? preset.widthMm : preset.heightMm;
  return {
    presetId: preset.id,
    paperLabel: preset.paperLabel,
    presetName: preset.name,
    landscape,
    paperWidthMm,
    paperHeightMm,
    paperWidthPx: mmToPx(paperWidthMm),
    paperHeightPx: mmToPx(paperHeightMm),
    margins: { ...preset.margins },
  };
}

/** Content-box height in px (paper minus top/bottom margins) at 100% zoom. */
export function contentHeightPx(setup: ResolvedPageSetup): number {
  return Math.max(200, setup.paperHeightPx - cmToPx(setup.margins.topCm) - cmToPx(setup.margins.bottomCm));
}

/** Compact number for CSS (2.5 → "2.5", 2.54 → "2.54"). */
function cssNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * Dynamic @page rule matching the current document, injected as a <style>
 * tag (static @page in index.css stays as fallback). Lets print/PDF use the
 * preset's paper size, orientation, and margins instead of fixed A4.
 */
export function buildAtPageCss(setup: ResolvedPageSetup): string {
  const { paperWidthMm, paperHeightMm, margins } = setup;
  return (
    `@page{size:${cssNumber(paperWidthMm)}mm ${cssNumber(paperHeightMm)}mm;` +
    `margin:${cssNumber(margins.topCm)}cm ${cssNumber(margins.rightCm)}cm ` +
    `${cssNumber(margins.bottomCm)}cm ${cssNumber(margins.leftCm)}cm;}`
  );
}
