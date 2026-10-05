import { useEffect, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { LayoutTemplate, PaintBucket, Trash } from "lucide-react";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ColorPickerDialog } from "@/components/ColorPicker";
import { SheetCells } from "@/components/icons/sheet-cells";
import { SheetColumnLeft } from "@/components/icons/sheet-column-left";
import { SheetColumnRight } from "@/components/icons/sheet-column-right";
import { SheetColumns } from "@/components/icons/sheet-columns";
import { SheetRowAbove } from "@/components/icons/sheet-row-above";
import { SheetRowBelow } from "@/components/icons/sheet-row-below";
import { SheetRows } from "@/components/icons/sheet-rows";
import { TableCellsMergeIcon } from "@/components/icons/table-cells-merge";
import { TableCellsSplitIcon } from "@/components/icons/table-cells-split";
import { normalizeTableAlignment } from "./tablePropertiesExtension";
import { isHeaderColumnActive, isHeaderRowActive, shouldPreserveSelection } from "./tableSelection";

// WHY: Stock shadcn context menu — only ui/* primitives, no custom menu CSS.
// Top level stays short (Rows, Columns, Cells, Fill, Style, Delete); details
// live one level down in flyout submenus. Outside tables the native browser
// menu is untouched (spellcheck etc. keep working).

// DOM-free check so the rule is unit-testable with fake targets.
export function eventTargetInTable(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  const closest = (target as { closest?: unknown }).closest;
  if (typeof closest !== "function") return false;
  try {
    return (closest as (selector: string) => unknown).call(target, "table") != null;
  } catch {
    return false;
  }
}

// Fill palette for the Fill submenu (dialog covers custom colors).
export const CELL_FILL_SWATCHES = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fecdd3" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Gray", value: "#e5e7eb" },
] as const;

interface TableContextMenuProperties {
  editor: Editor;
  children: React.ReactNode;
}

export function TableContextMenu({ editor, children }: TableContextMenuProperties) {
  // WHY: Capture-phase gates — non-table right-clicks are stopped before Radix
  // sees them (native menu survives). Inside tables, Word behavior applies:
  // right-clicking INSIDE a non-empty selection keeps it (so Merge/Split stay
  // enabled); clicks outside move the caret. The mousedown guard matters
  // because the browser moves the caret on right-mousedown, BEFORE the
  // contextmenu event — without preventDefault the cell selection would
  // already be dead by the time the menu opens. Listener lives on document
  // because the editor view may not exist yet on first mount (past crash).
  useEffect(() => {
    const posAtPoint = (clientX: number, clientY: number): number | null => {
      try {
        if (editor.isDestroyed) return null;
        const coords = editor.view.posAtCoords({ left: clientX, top: clientY });
        return coords && Number.isFinite(coords.pos) ? coords.pos : null;
      } catch {
        return null;
      }
    };
    const handleMouseDownCapture = (event: MouseEvent) => {
      if (event.button !== 2 || !eventTargetInTable(event.target)) return;
      const pos = posAtPoint(event.clientX, event.clientY);
      if (pos !== null) {
        try {
          if (shouldPreserveSelection(editor.state.selection, pos)) event.preventDefault();
        } catch {
          // Fall through to default behavior on any surprise.
        }
      }
    };
    const handleContextMenuCapture = (event: MouseEvent) => {
      if (!eventTargetInTable(event.target)) {
        event.stopPropagation();
        return;
      }
      // WHY: Table clicks move the caret Word-style, EXCEPT inside a live
      // selection (see above) — and fall through so the custom menu opens.
      // Invalid click position (e.g. table edge) keeps current selection.
      const pos = posAtPoint(event.clientX, event.clientY);
      if (pos === null) return;
      try {
        if (shouldPreserveSelection(editor.state.selection, pos)) return;
      } catch {
        return;
      }
      try {
        editor.commands.setTextSelection(pos);
      } catch {
        // Keep current selection.
      }
    };
    document.addEventListener("mousedown", handleMouseDownCapture, true);
    document.addEventListener("contextmenu", handleContextMenuCapture, true);
    return () => {
      document.removeEventListener("mousedown", handleMouseDownCapture, true);
      document.removeEventListener("contextmenu", handleContextMenuCapture, true);
    };
  }, [editor]);

  // WHY: Same staleness fix as the ribbon — menu content only mounts on open,
  // so without a live snapshot the checks/disabled states would lag the caret.
  const menuState = useEditorState({
    editor,
    selector: (snapshot) => {
      const liveEditor = snapshot.editor;
      const tableAttrs = liveEditor.getAttributes("table") as {
        borderless?: unknown;
        tableAlignment?: unknown;
      };
      return {
        bordersOn: tableAttrs.borderless !== true,
        alignment: normalizeTableAlignment(tableAttrs.tableAlignment) ?? "left",
        headerOn: isHeaderRowActive(liveEditor.state.selection),
        headerColumnOn: isHeaderColumnActive(liveEditor.state.selection),
        canToggleHeaderColumn: liveEditor.can().toggleHeaderColumn(),
        canAddRowBefore: liveEditor.can().addRowBefore(),
        canAddRowAfter: liveEditor.can().addRowAfter(),
        canDeleteRow: liveEditor.can().deleteRow(),
        canAddColumnBefore: liveEditor.can().addColumnBefore(),
        canAddColumnAfter: liveEditor.can().addColumnAfter(),
        canDeleteColumn: liveEditor.can().deleteColumn(),
        canMergeCells: liveEditor.can().mergeCells(),
        canSplitCell: liveEditor.can().splitCell(),
        canToggleHeaderRow: liveEditor.can().toggleHeaderRow(),
        canDeleteTable: liveEditor.can().deleteTable(),
      };
    },
  });
  const { bordersOn, alignment, headerOn, headerColumnOn } = menuState;
  const [customFillOpen, setCustomFillOpen] = useState(false);

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <SheetRows className="h-4 w-4 text-muted-foreground" aria-hidden />
            Rows
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem disabled={!menuState.canAddRowBefore} onSelect={() => editor.chain().focus().addRowBefore().run()}>
              <SheetRowAbove className="h-4 w-4 text-muted-foreground" aria-hidden />
              Row above
            </ContextMenuItem>
            <ContextMenuItem disabled={!menuState.canAddRowAfter} onSelect={() => editor.chain().focus().addRowAfter().run()}>
              <SheetRowBelow className="h-4 w-4 text-muted-foreground" aria-hidden />
              Row below
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!menuState.canDeleteRow} onSelect={() => editor.chain().focus().deleteRow().run()}>
              <Trash className="h-4 w-4 text-muted-foreground" aria-hidden />
              Delete row
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <SheetColumns className="h-4 w-4 text-muted-foreground" aria-hidden />
            Columns
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem disabled={!menuState.canAddColumnBefore} onSelect={() => editor.chain().focus().addColumnBefore().run()}>
              <SheetColumnLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
              Column left
            </ContextMenuItem>
            <ContextMenuItem disabled={!menuState.canAddColumnAfter} onSelect={() => editor.chain().focus().addColumnAfter().run()}>
              <SheetColumnRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              Column right
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!menuState.canDeleteColumn} onSelect={() => editor.chain().focus().deleteColumn().run()}>
              <Trash className="h-4 w-4 text-muted-foreground" aria-hidden />
              Delete column
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <SheetCells className="h-4 w-4 text-muted-foreground" aria-hidden />
            Cells
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem disabled={!menuState.canMergeCells} onSelect={() => editor.chain().focus().mergeCells().run()}>
              <TableCellsMergeIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
              Merge cells
            </ContextMenuItem>
            <ContextMenuItem disabled={!menuState.canSplitCell} onSelect={() => editor.chain().focus().splitCell().run()}>
              <TableCellsSplitIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
              Split cell
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <PaintBucket className="h-4 w-4 text-muted-foreground" aria-hidden />
            Fill
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {CELL_FILL_SWATCHES.map((swatch) => (
              <ContextMenuItem
                key={swatch.value}
                onSelect={() =>
                  editor.chain().focus().setCellAttribute("backgroundColor", swatch.value).run()
                }
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded border border-border"
                  style={{ backgroundColor: swatch.value }}
                />
                {swatch.name}
              </ContextMenuItem>
            ))}
            <ContextMenuItem onSelect={() => setCustomFillOpen(true)}>
              Custom…
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => editor.chain().focus().setCellAttribute("backgroundColor", null).run()}
            >
              No fill
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" aria-hidden />
            Style
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuCheckboxItem
              checked={headerOn}
              disabled={!menuState.canToggleHeaderRow}
              onCheckedChange={() => editor.chain().focus().toggleHeaderRow().run()}
            >
              Header row
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem
              checked={headerColumnOn}
              disabled={!menuState.canToggleHeaderColumn}
              onCheckedChange={() => editor.chain().focus().toggleHeaderColumn().run()}
            >
              Header column
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem
              checked={bordersOn}
              onCheckedChange={() =>
                editor.chain().focus().updateAttributes("table", { borderless: bordersOn }).run()
              }
            >
              Borders
            </ContextMenuCheckboxItem>
            <ContextMenuSeparator />
            <ContextMenuRadioGroup
              value={alignment}
              onValueChange={(value) => {
                const next = normalizeTableAlignment(value) ?? "left";
                editor.chain().focus().updateAttributes("table", { tableAlignment: next === "left" ? null : next }).run();
              }}
            >
              <ContextMenuRadioItem value="left">Align left</ContextMenuRadioItem>
              <ContextMenuRadioItem value="center">Align center</ContextMenuRadioItem>
              <ContextMenuRadioItem value="right">Align right</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={!menuState.canDeleteTable}
          onSelect={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash className="h-4 w-4 text-muted-foreground" aria-hidden />
          Delete table
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
      <ColorPickerDialog
        open={customFillOpen}
        onClose={() => setCustomFillOpen(false)}
        title="Cell fill"
        description="Pick a color for the selected cells."
        onSelect={(hex) => editor.chain().focus().setCellAttribute("backgroundColor", hex).run()}
      />
    </>
  );
}
