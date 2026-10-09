import { TableMap } from "@tiptap/pm/tables";
import type { Selection } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";

// WHY: All table-selection geometry lives here — never in the menu component.
// Pure over ProseMirror objects (unit-tested with real Schema/TableMap), and
// TableMap comes from @tiptap/pm/tables (a direct dependency), so no code
// reaches transitively into node_modules. Offset conventions mirror
// prosemirror-tables itself: cell offsets are relative to the table content
// start, anchors sit directly inside rows (parent chain … > table > row).

interface CellAnchors {
  $anchorCell?: { pos: number } | null;
  $headCell?: { pos: number } | null;
}

function cellAnchors(selection: Selection): { anchorCellPos: number; headCellPos: number } | null {
  // WHY: Duck-typed instead of instanceof — immune to duplicate class
  // identities across bundler copies. Only prosemirror-tables selections
  // carry cell anchors.
  const maybe = selection as Selection & CellAnchors;
  if (
    maybe.$anchorCell == null ||
    maybe.$headCell == null ||
    typeof maybe.$anchorCell.pos !== "number" ||
    typeof maybe.$headCell.pos !== "number"
  ) {
    return null;
  }
  return { anchorCellPos: maybe.$anchorCell.pos, headCellPos: maybe.$headCell.pos };
}

/** Nearest table ancestor of $pos, or null. Never throws. */
function enclosingTable($pos: { depth: number; node: (depth: number) => PMNode; start: (depth: number) => number }): {
  table: PMNode;
  tableStart: number;
} | null {
  try {
    for (let depth = $pos.depth; depth > 0; depth--) {
      if ($pos.node(depth).type.name === "table") {
        return { table: $pos.node(depth), tableStart: $pos.start(depth) };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Exact doc range the selection covers. For multi-cell selections this walks
 * the selected rectangle (not just the head cell); everything else falls back
 * to the anchor/head span. Never throws.
 */
export function selectionDocRange(selection: Selection): { from: number; to: number; empty: boolean } {
  const fallback = () => {
    const anchorPos = selection.$anchor.pos;
    const headPos = selection.$head.pos;
    return {
      empty: selection.empty,
      from: Math.min(anchorPos, headPos),
      to: Math.max(anchorPos, headPos),
    };
  };
  try {
    const anchors = cellAnchors(selection);
    if (!anchors) return fallback();
    const found = enclosingTable(selection.$anchor);
    if (!found) return fallback();
    const map = TableMap.get(found.table);
    const rect = map.rectBetween(anchors.anchorCellPos - found.tableStart, anchors.headCellPos - found.tableStart);
    let from = Infinity;
    let to = -Infinity;
    for (let row = rect.top; row < rect.bottom; row++) {
      for (let col = rect.left; col < rect.right; col++) {
        const cellOffset = map.map[row * map.width + col];
        const cell = found.table.nodeAt(cellOffset);
        if (!cell) continue;
        from = Math.min(from, found.tableStart + cellOffset);
        to = Math.max(to, found.tableStart + cellOffset + cell.nodeSize);
      }
    }
    if (!Number.isFinite(from)) return fallback();
    return { empty: selection.empty, from, to };
  } catch {
    return fallback();
  }
}

/**
 * Is the selection inside a table (caret, cell range, or the table node
 * itself)? Drives the contextual toolbar swap. Never throws.
 */
export function isSelectionInTable(selection: Selection): boolean {
  try {
    const maybe = selection as Selection & { node?: PMNode };
    if (maybe.node && maybe.node.type.name === "table") return true;
    for (const $pos of [selection.$anchor, selection.$head]) {
      for (let depth = $pos.depth; depth > 0; depth--) {
        if ($pos.node(depth).type.name === "table") return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Should a right-click at clickPos preserve (not collapse) the selection?
 * Word behavior: clicks inside a non-empty selection keep it (so Merge/Split
 * stay enabled); clicks outside move the caret.
 */
export function shouldPreserveSelection(selection: Selection, clickPos: number): boolean {
  const range = selectionDocRange(selection);
  return !range.empty && clickPos >= range.from && clickPos <= range.to;
}

/**
 * Is an entire table line headers? kind "row" checks row 0, "column" checks
 * column 0 (Word's Header Row / First Column flags). Strict (every cell), so
 * the checkboxes mirror exactly what our own toggles produce — and stay put
 * no matter where the caret sits, unlike caret-following isActive checks.
 * Never throws.
 */
function headerLineActive(selection: Selection, kind: "row" | "column"): boolean {
  try {
    const found = enclosingTable(selection.$anchor);
    if (!found) return false;
    const map = TableMap.get(found.table);
    const length = kind === "row" ? map.width : map.height;
    if (map.width <= 0 || map.height <= 0 || length <= 0) return false;
    for (let i = 0; i < length; i++) {
      const cellOffset = kind === "row" ? map.map[i] : map.map[i * map.width];
      const cell = found.table.nodeAt(cellOffset);
      if (!cell || cell.type.name !== "tableHeader") return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Is the table's first row headers? Drives the "Header row" checkbox. */
export function isHeaderRowActive(selection: Selection): boolean {
  return headerLineActive(selection, "row");
}

/** Is the table's first column headers? Drives the "Header column" checkbox. */
export function isHeaderColumnActive(selection: Selection): boolean {
  return headerLineActive(selection, "column");
}
