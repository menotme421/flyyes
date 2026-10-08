import { describe, expect, it } from "vitest";
import { resolveToolbarContext } from "@/editor/ContextTools";
import { isSelectionInTable } from "@/editor/tableSelection";

// WHY: The right-zone swap is selection-driven and the More button must never
// trigger it — pin the priority rule (image > table > link > default) and the
// table detector here so regressions fail loudly instead of hiding tools.

describe("resolveToolbarContext", () => {
  it("shows the default panel for plain text", () => {
    expect(
      resolveToolbarContext({ imageSelected: false, inTable: false, linkActive: false })
    ).toBe("default");
  });

  it("shows link tools on a link", () => {
    expect(
      resolveToolbarContext({ imageSelected: false, inTable: false, linkActive: true })
    ).toBe("link");
  });

  it("prefers table tools over link tools", () => {
    expect(
      resolveToolbarContext({ imageSelected: false, inTable: true, linkActive: true })
    ).toBe("table");
  });

  it("prefers image tools over everything", () => {
    expect(
      resolveToolbarContext({ imageSelected: true, inTable: true, linkActive: true })
    ).toBe("image");
  });

  it("swaps back to default once the object is deselected", () => {
    expect(
      resolveToolbarContext({ imageSelected: false, inTable: false, linkActive: false })
    ).toBe("default");
  });
});

describe("isSelectionInTable", () => {
  // WHY: Minimal fakes shaped like ProseMirror resolved positions — the
  // helper only walks depth/node(type name), so no real schema is needed.
  function posInTable() {
    return {
      depth: 3,
      node: (depth: number) => ({ type: { name: depth === 1 ? "table" : "tableCell" } }),
    };
  }

  function posOutside() {
    return {
      depth: 1,
      node: () => ({ type: { name: "paragraph" } }),
    };
  }

  it("detects a caret inside a table", () => {
    const caret = { $anchor: posInTable(), $head: posInTable(), empty: true };
    expect(isSelectionInTable(caret as never)).toBe(true);
  });

  it("ignores plain-text selections", () => {
    const caret = { $anchor: posOutside(), $head: posOutside(), empty: true };
    expect(isSelectionInTable(caret as never)).toBe(false);
  });

  it("detects a node selection directly on a table", () => {
    const nodeSelection = {
      node: { type: { name: "table" } },
      $anchor: posOutside(),
      $head: posOutside(),
      empty: false,
    };
    expect(isSelectionInTable(nodeSelection as never)).toBe(true);
  });

  it("never throws on broken selections", () => {
    expect(isSelectionInTable(null as never)).toBe(false);
    expect(isSelectionInTable(undefined as never)).toBe(false);
    expect(isSelectionInTable({} as never)).toBe(false);
  });
});
