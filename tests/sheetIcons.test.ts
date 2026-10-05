import { describe, expect, it } from "vitest";
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
});
