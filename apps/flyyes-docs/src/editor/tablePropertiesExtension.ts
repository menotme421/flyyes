import { Extension } from "@tiptap/core";

// WHY: Word-style table properties as a tiny owned extension (no new dependency).
// TipTap ships the *commands* (setCellAttribute, updateAttributes) but no styling
// attributes, so we declare four: cell background, cell vertical alignment,
// table borders on/off, table alignment. Table alignment stays supported for
// legacy documents (render + DOCX) but has no UI — cell vertical alignment
// replaced it in the bar and the menu.
// Styling renders as inline style / data attrs so HTML, preview, and DOCX all see it.

export type TableAlignment = "left" | "center" | "right";

export type VerticalAlignment = "top" | "middle" | "bottom";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

// WHY: Hex-only (what our color inputs produce). Pasted rgb()/named colors are
// dropped rather than passed through — keeps stored data predictable for DOCX export.
export function normalizeCellBackground(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : null;
}

export function normalizeTableAlignment(value: unknown): TableAlignment | null {
  return value === "center" || value === "right" || value === "left"
    ? value
    : null;
}

// WHY: Strict allowlist like the rest — pasted vertical-align values outside
// top/middle/bottom (or baseline soup from Word HTML) fall back to default.
export function normalizeVerticalAlignment(value: unknown): VerticalAlignment | null {
  return value === "top" || value === "middle" || value === "bottom"
    ? value
    : null;
}

export function normalizeBorderless(value: unknown): boolean {
  return value === true;
}

export const TableProperties = Extension.create({
  name: "tableProperties",

  addGlobalAttributes() {
    return [
      {
        types: ["tableCell", "tableHeader"],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) =>
              normalizeCellBackground(element.style.backgroundColor || element.getAttribute("data-cell-bg")),
            renderHTML: (attributes) => {
              const color = normalizeCellBackground(attributes.backgroundColor);
              if (!color) return {};
              return { "data-cell-bg": color, style: `background-color: ${color}` };
            },
          },
          verticalAlignment: {
            default: null,
            parseHTML: (element) =>
              normalizeVerticalAlignment(element.style.verticalAlign || element.getAttribute("data-cell-valign")),
            renderHTML: (attributes) => {
              const vertical = normalizeVerticalAlignment(attributes.verticalAlignment);
              if (!vertical || vertical === "middle") return {};
              return { "data-cell-valign": vertical, style: `vertical-align: ${vertical}` };
            },
          },
        },
      },
      {
        types: ["table"],
        attributes: {
          borderless: {
            default: false,
            parseHTML: (element) => normalizeBorderless(element.getAttribute("data-table-borderless") === "true"),
            renderHTML: (attributes) =>
              normalizeBorderless(attributes.borderless) ? { "data-table-borderless": "true" } : {},
          },
          tableAlignment: {
            default: null,
            parseHTML: (element) => normalizeTableAlignment(element.getAttribute("data-table-align")),
            renderHTML: (attributes) => {
              const alignment = normalizeTableAlignment(attributes.tableAlignment);
              if (!alignment || alignment === "left") return {};
              const marginStyle =
                alignment === "center"
                  ? "margin-left: auto; margin-right: auto"
                  : "margin-left: auto";
              return { "data-table-align": alignment, style: marginStyle };
            },
          },
        },
      },
    ];
  },
});
