import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SheetCells } from "@/components/icons/sheet-cells";
import { SheetColumnLeft } from "@/components/icons/sheet-column-left";
import { SheetColumnRight } from "@/components/icons/sheet-column-right";
import { SheetColumns } from "@/components/icons/sheet-columns";
import { SheetRowAbove } from "@/components/icons/sheet-row-above";
import { SheetRowBelow } from "@/components/icons/sheet-row-below";
import { SheetRows } from "@/components/icons/sheet-rows";
import { TableCellsMergeIcon } from "@/components/icons/table-cells-merge";
import { TableCellsSplitIcon } from "@/components/icons/table-cells-split";

// WHY: Owned lucide-studio icons — importing them here fails the build early
// if an export is renamed or the file moves, instead of at usage time.
describe("owned sheet icons", () => {
  it("exports all row variants", () => {
    expect(SheetRowAbove).toBeTruthy();
    expect(SheetRowBelow).toBeTruthy();
    expect(SheetRows).toBeTruthy();
  });

  it("exports all column variants", () => {
    expect(SheetColumnLeft).toBeTruthy();
    expect(SheetColumnRight).toBeTruthy();
    expect(SheetColumns).toBeTruthy();
  });

  it("exports the cells parent icon", () => {
    expect(SheetCells).toBeTruthy();
  });

  it("exports the custom merge/split icons", () => {
    expect(TableCellsMergeIcon).toBeTruthy();
    expect(TableCellsSplitIcon).toBeTruthy();
  });

  it("pins Carbon-proof paint as inline styles (beats ghost-button CSS)", () => {
    // WHY: Carbon ghost buttons restyle child SVGs two ways (attributes lose
    // to any CSS): a fill rule that blobbed every closed shape solid black,
    // and blue button text bleeding through stroke="currentColor". Inline
    // styles win over stylesheets on both.
    const markup = renderToStaticMarkup(SheetRowAbove({} as never) as never);
    expect(markup).toContain("fill:none");
    expect(markup).toContain("cds-icon-primary");
  });

  it("defaults to 16px like Carbon icons in buttons (not 24)", () => {
    // WHY: 24px customs rendered 1.5x too big with true-2px strokes next
    // to Carbon's 16px/1px icons in the same 32px ghost buttons.
    const markup = renderToStaticMarkup(SheetRowAbove({} as never) as never);
    expect(markup).toContain('width="16"');
    expect(markup).toContain('height="16"');
  });
});
