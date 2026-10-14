import { useEffect, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Grid2x2, Palette, SquareArrowDown, SquareArrowLeft, SquareArrowRight, SquareArrowUp, TableCellsMerge, TableCellsSplit, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@flyyes/ui";
import { ColorPickerDialog } from "@/components/ColorPicker";
import { icon16 } from "@/components/icon16";
import { normalizeVerticalAlignment } from "./tablePropertiesExtension";
import { isHeaderColumnActive, isHeaderRowActive, shouldPreserveSelection } from "./tableSelection";

// WHY: Radix ContextMenu with flyout submenus — the long flat list became five
// short flyouts (Rows, Columns, Cells, Fill, Style) plus top-level Delete.
// Outside tables the native browser menu is untouched (spellcheck etc. keep
// working). Rendered in a body portal so page sheets (overflow hidden) can
// never clip it.

// WHY: Radix renders renderIcon with no size (lucide defaults to 24).
// Module-level consts keep identity stable across renders.
const RowAboveIcon = icon16(SquareArrowUp);
const RowBelowIcon = icon16(SquareArrowDown);
const ColumnLeftIcon = icon16(SquareArrowLeft);
const ColumnRightIcon = icon16(SquareArrowRight);
const MergeCellsIcon = icon16(TableCellsMerge);
const SplitCellIcon = icon16(TableCellsSplit);
const PaletteIcon = icon16(Palette);
const BordersIcon = icon16(Grid2x2);
const TrashIcon = icon16(Trash2);

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
      };
      const cellAttrs = liveEditor.getAttributes("tableCell") as { verticalAlignment?: unknown };
      const headerAttrs = liveEditor.getAttributes("tableHeader") as { verticalAlignment?: unknown };
      return {
        bordersOn: tableAttrs.borderless !== true,
        cellVertical: normalizeVerticalAlignment(cellAttrs.verticalAlignment ?? headerAttrs.verticalAlignment) ?? "middle",
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
  const { bordersOn, cellVertical, headerOn, headerColumnOn } = menuState;
  const [customFillOpen, setCustomFillOpen] = useState(false);

  // WHY: Radix closes on select by itself — run only, no manual close.
  function runAndClose(run: () => void): () => void {
    return () => {
      run();
    };
  }

  return (
    <>
      {/* WHY: Radix Trigger opens at the cursor; the document capture gate
          below stops non-table right-clicks first so the native menu (and
          spellcheck) survives outside tables. */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onContextMenu={(event) => {
              if (!eventTargetInTable(event.target)) {
                event.stopPropagation();
              }
            }}
          >
            {children}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <RowAboveIcon />
              Rows
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem
                disabled={!menuState.canAddRowBefore}
                onSelect={runAndClose(() => editor.chain().focus().addRowBefore().run())}
              >
                <RowAboveIcon />
                Row above
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!menuState.canAddRowAfter}
                onSelect={runAndClose(() => editor.chain().focus().addRowAfter().run())}
              >
                <RowBelowIcon />
                Row below
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!menuState.canDeleteRow}
                onSelect={runAndClose(() => editor.chain().focus().deleteRow().run())}
              >
                <TrashIcon />
                Delete row
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ColumnLeftIcon />
              Columns
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem
                disabled={!menuState.canAddColumnBefore}
                onSelect={runAndClose(() => editor.chain().focus().addColumnBefore().run())}
              >
                <ColumnLeftIcon />
                Column left
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!menuState.canAddColumnAfter}
                onSelect={runAndClose(() => editor.chain().focus().addColumnAfter().run())}
              >
                <ColumnRightIcon />
                Column right
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!menuState.canDeleteColumn}
                onSelect={runAndClose(() => editor.chain().focus().deleteColumn().run())}
              >
                <TrashIcon />
                Delete column
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <MergeCellsIcon />
              Cells
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem
                disabled={!menuState.canMergeCells}
                onSelect={runAndClose(() => editor.chain().focus().mergeCells().run())}
              >
                <MergeCellsIcon />
                Merge cells
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!menuState.canSplitCell}
                onSelect={runAndClose(() => editor.chain().focus().splitCell().run())}
              >
                <SplitCellIcon />
                Split cell
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <PaletteIcon />
              Fill
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {CELL_FILL_SWATCHES.map((swatch) => (
                <ContextMenuItem
                  key={swatch.value}
                  onSelect={runAndClose(() =>
                    editor.chain().focus().setCellAttribute("backgroundColor", swatch.value).run()
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="fly-swatch h-4 w-4 rounded"
                    style={{ backgroundColor: swatch.value }}
                  />
                  {swatch.name}
                </ContextMenuItem>
              ))}
              <ContextMenuItem onSelect={runAndClose(() => setCustomFillOpen(true))}>
                Custom…
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={runAndClose(() =>
                  editor.chain().focus().setCellAttribute("backgroundColor", null).run()
                )}
              >
                No fill
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <BordersIcon />
              Style
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuCheckboxItem
                checked={headerOn}
                disabled={!menuState.canToggleHeaderRow}
                onCheckedChange={runAndClose(() => editor.chain().focus().toggleHeaderRow().run())}
              >
                Header row
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={headerColumnOn}
                disabled={!menuState.canToggleHeaderColumn}
                onCheckedChange={runAndClose(() => editor.chain().focus().toggleHeaderColumn().run())}
              >
                Header column
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={bordersOn}
                onCheckedChange={runAndClose(() =>
                  editor.chain().focus().updateAttributes("table", { borderless: bordersOn }).run()
                )}
              >
                Borders
              </ContextMenuCheckboxItem>
              <ContextMenuSeparator />
              <ContextMenuLabel>Cell vertical alignment</ContextMenuLabel>
              <ContextMenuRadioGroup
                value={cellVertical}
                onValueChange={(next: string) => {
                  const aligned = normalizeVerticalAlignment(next) ?? "middle";
                  editor
                    .chain()
                    .focus()
                    .setCellAttribute("verticalAlignment", aligned === "middle" ? null : aligned)
                    .run();
                }}
              >
                <ContextMenuRadioItem value="top">Align top</ContextMenuRadioItem>
                <ContextMenuRadioItem value="middle">Align middle</ContextMenuRadioItem>
                <ContextMenuRadioItem value="bottom">Align bottom</ContextMenuRadioItem>
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={!menuState.canDeleteTable}
            onSelect={runAndClose(() => editor.chain().focus().deleteTable().run())}
            className="text-destructive focus:text-destructive"
          >
            <TrashIcon />
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
