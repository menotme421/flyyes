import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import type { Node as PMNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { isHeaderColumnActive, isHeaderRowActive, selectionDocRange, shouldPreserveSelection } from "@/editor/tableSelection";

// WHY: Right-click preservation + header-column state are pure geometry over
// ProseMirror objects — tested here with a real Schema (no DOM, no editor),
// so menu behavior is pinned without a browser. Offsets mirror
// prosemirror-tables conventions (cell offsets relative to table content
// start; anchors sit directly inside rows before cells).

const tableTestSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0] },
    text: { group: "inline" },
    table: {
      group: "block",
      content: "tableRow+",
      tableRole: "table",
      isolating: true,
      toDOM: () => ["table", 0],
    },
    tableRow: { content: "(tableCell|tableHeader)+", tableRole: "row", toDOM: () => ["tr", 0] },
    tableCell: {
      content: "block+",
      tableRole: "cell",
      isolating: true,
      attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null } },
      toDOM: () => ["td", 0],
    },
    tableHeader: {
      content: "block+",
      tableRole: "header_cell",
      isolating: true,
      attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null } },
      toDOM: () => ["th", 0],
    },
  },
});

function paragraph(text: string): PMNode {
  return tableTestSchema.nodes.paragraph.create(null, tableTestSchema.text(text));
}

function buildTable(options: { headerRow?: boolean; headerColumn?: boolean } = {}): PMNode {
  const cell = (text: string) => tableTestSchema.nodes.tableCell.create(null, paragraph(text));
  const header = (text: string) => tableTestSchema.nodes.tableHeader.create(null, paragraph(text));
  const row = (...cells: PMNode[]) => tableTestSchema.nodes.tableRow.create(null, cells);
  const pick = (text: string, r: number, c: number) =>
    (options.headerRow && r === 0) || (options.headerColumn && c === 0) ? header(text) : cell(text);
  const table = tableTestSchema.nodes.table.create(null, [
    row(pick("a", 0, 0), pick("b", 0, 1)),
    row(pick("c", 1, 0), pick("d", 1, 1)),
  ]);
  return tableTestSchema.nodes.doc.create(null, [table, paragraph("after")]);
}

// Doc position directly before cell (r,c): table at 0, rows/cells are 12/5 wide.
function beforeCell(row: number, col: number): number {
  return 2 + row * 12 + col * 5;
}

// Text position inside cell (r,c) single-char paragraph.
function textIn(row: number, col: number): number {
  return beforeCell(row, col) + 2;
}

describe("shouldPreserveSelection", () => {
  it("keeps a multi-cell selection when clicking inside it", () => {
    const doc = buildTable();
    const selection = new CellSelection(doc.resolve(beforeCell(0, 0)), doc.resolve(beforeCell(1, 1)));
    expect(shouldPreserveSelection(selection, textIn(1, 0))).toBe(true);
  });

  it("keeps a single selected cell when clicking inside it", () => {
    const doc = buildTable();
    const selection = new CellSelection(doc.resolve(beforeCell(0, 0)), doc.resolve(beforeCell(0, 0)));
    expect(shouldPreserveSelection(selection, textIn(0, 0))).toBe(true);
  });

  it("moves the caret when clicking outside the selection", () => {
    const doc = buildTable();
    const selection = new CellSelection(doc.resolve(beforeCell(0, 0)), doc.resolve(beforeCell(0, 0)));
    expect(shouldPreserveSelection(selection, 30)).toBe(false);
  });

  it("collapses empty selections and honors plain text ranges", () => {
    const doc = buildTable();
    const caret = TextSelection.create(doc, 30);
    expect(shouldPreserveSelection(caret, 30)).toBe(false);
    const textRange = TextSelection.create(doc, 2, 6);
    expect(shouldPreserveSelection(textRange, 4)).toBe(true);
    expect(shouldPreserveSelection(textRange, 20)).toBe(false);
  });
});

describe("selectionDocRange", () => {
  it("spans the full cell rectangle for multi-cell selections", () => {
    const doc = buildTable();
    const selection = new CellSelection(doc.resolve(beforeCell(0, 0)), doc.resolve(beforeCell(1, 1)));
    const range = selectionDocRange(selection);
    expect(range.empty).toBe(false);
    expect(range.from).toBe(beforeCell(0, 0));
    expect(range.to).toBe(beforeCell(1, 1) + 5);
  });
});

describe("isHeaderColumnActive", () => {
  it("is false in body tables", () => {
    const doc = buildTable();
    expect(isHeaderColumnActive(TextSelection.create(doc, textIn(1, 0)))).toBe(false);
  });

  it("is true anywhere once the first column is headers", () => {
    const doc = buildTable({ headerColumn: true });
    // WHY: Table-level state — true even with the caret in a body cell.
    expect(isHeaderColumnActive(TextSelection.create(doc, textIn(1, 0)))).toBe(true);
    expect(isHeaderColumnActive(TextSelection.create(doc, textIn(0, 1)))).toBe(true);
  });

  it("is false outside tables", () => {
    const doc = buildTable();
    expect(isHeaderColumnActive(TextSelection.create(doc, 30))).toBe(false);
  });
});

describe("isHeaderRowActive", () => {
  it("is false in body tables", () => {
    const doc = buildTable();
    expect(isHeaderRowActive(TextSelection.create(doc, textIn(1, 1)))).toBe(false);
  });

  it("is true anywhere once the first row is headers", () => {
    const doc = buildTable({ headerRow: true });
    // WHY: Table-level state — true even with the caret in a body cell.
    expect(isHeaderRowActive(TextSelection.create(doc, textIn(1, 1)))).toBe(true);
    expect(isHeaderRowActive(TextSelection.create(doc, textIn(0, 0)))).toBe(true);
  });

  it("is false outside tables", () => {
    const doc = buildTable();
    expect(isHeaderRowActive(TextSelection.create(doc, 30))).toBe(false);
  });
});
