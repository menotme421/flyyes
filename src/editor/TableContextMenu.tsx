import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorState, type Editor } from "@tiptap/react";
import { ColorPalette, TrashCan } from "@carbon/icons-react";
import { Menu, MenuItem, MenuItemDivider, MenuItemRadioGroup, MenuItemSelectable } from "@carbon/react";
import { ColorPickerDialog } from "@/components/ColorPicker";
import { SheetColumnLeft } from "@/components/icons/sheet-column-left";
import { SheetColumnRight } from "@/components/icons/sheet-column-right";
import { SheetRowAbove } from "@/components/icons/sheet-row-above";
import { SheetRowBelow } from "@/components/icons/sheet-row-below";
import { TableCellsMergeIcon } from "@/components/icons/table-cells-merge";
import { TableCellsSplitIcon } from "@/components/icons/table-cells-split";
import { TableBordersIcon } from "@/components/icons/table-borders";
import { normalizeVerticalAlignment } from "./tablePropertiesExtension";
import { isHeaderColumnActive, isHeaderRowActive, shouldPreserveSelection } from "./tableSelection";

// WHY: Carbon Menu with flyout submenus — the long flat list became five
// short flyouts (Rows, Columns, Cells, Fill, Style) plus top-level Delete.
// Outside tables the native browser menu is untouched (spellcheck etc. keep
// working). Rendered in a body portal so page sheets (overflow hidden) can
// never clip it.

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // WHY: Every action closes the menu — a controlled Carbon Menu stays open
  // until told otherwise (unlike Radix, which closes on select).
  function runAndClose(run: () => void): () => void {
    return () => {
      run();
      setMenuOpen(false);
    };
  }

  return (
    <>
      <div
        onContextMenu={(event) => {
          if (!eventTargetInTable(event.target)) return;
          event.preventDefault();
          setMenuPosition({ x: event.clientX, y: event.clientY });
          setMenuOpen(true);
        }}
      >
        {children}
      </div>
      {menuOpen
        ? createPortal(
            <Menu
              open
              label="Table"
              x={menuPosition.x}
              y={menuPosition.y}
              onClose={() => setMenuOpen(false)}
            >
              <MenuItem label="Rows" renderIcon={SheetRowAbove}>
                <MenuItem
                  label="Row above"
                  renderIcon={SheetRowAbove}
                  disabled={!menuState.canAddRowBefore}
                  onClick={runAndClose(() => editor.chain().focus().addRowBefore().run())}
                />
                <MenuItem
                  label="Row below"
                  renderIcon={SheetRowBelow}
                  disabled={!menuState.canAddRowAfter}
                  onClick={runAndClose(() => editor.chain().focus().addRowAfter().run())}
                />
                <MenuItem
                  label="Delete row"
                  renderIcon={TrashCan}
                  disabled={!menuState.canDeleteRow}
                  onClick={runAndClose(() => editor.chain().focus().deleteRow().run())}
                />
              </MenuItem>
              <MenuItem label="Columns" renderIcon={SheetColumnLeft}>
                <MenuItem
                  label="Column left"
                  renderIcon={SheetColumnLeft}
                  disabled={!menuState.canAddColumnBefore}
                  onClick={runAndClose(() => editor.chain().focus().addColumnBefore().run())}
                />
                <MenuItem
                  label="Column right"
                  renderIcon={SheetColumnRight}
                  disabled={!menuState.canAddColumnAfter}
                  onClick={runAndClose(() => editor.chain().focus().addColumnAfter().run())}
                />
                <MenuItem
                  label="Delete column"
                  renderIcon={TrashCan}
                  disabled={!menuState.canDeleteColumn}
                  onClick={runAndClose(() => editor.chain().focus().deleteColumn().run())}
                />
              </MenuItem>
              <MenuItem label="Cells" renderIcon={TableCellsMergeIcon}>
                <MenuItem
                  label="Merge cells"
                  renderIcon={TableCellsMergeIcon}
                  disabled={!menuState.canMergeCells}
                  onClick={runAndClose(() => editor.chain().focus().mergeCells().run())}
                />
                <MenuItem
                  label="Split cell"
                  renderIcon={TableCellsSplitIcon}
                  disabled={!menuState.canSplitCell}
                  onClick={runAndClose(() => editor.chain().focus().splitCell().run())}
                />
              </MenuItem>
              <MenuItem label="Fill" renderIcon={ColorPalette}>
                {CELL_FILL_SWATCHES.map((swatch) => (
                  <MenuItem
                    key={swatch.value}
                    label={swatch.name}
                    renderIcon={() => (
                      <span
                        aria-hidden="true"
                        className="fly-swatch h-4 w-4 rounded"
                        style={{ backgroundColor: swatch.value }}
                      />
                    )}
                    onClick={runAndClose(() =>
                      editor.chain().focus().setCellAttribute("backgroundColor", swatch.value).run()
                    )}
                  />
                ))}
                <MenuItem label="Custom…" onClick={runAndClose(() => setCustomFillOpen(true))} />
                <MenuItem
                  label="No fill"
                  onClick={runAndClose(() =>
                    editor.chain().focus().setCellAttribute("backgroundColor", null).run()
                  )}
                />
              </MenuItem>
              <MenuItem label="Style" renderIcon={TableBordersIcon}>
                <MenuItemSelectable
                  label="Header row"
                  selected={headerOn}
                  disabled={!menuState.canToggleHeaderRow}
                  onChange={runAndClose(() => editor.chain().focus().toggleHeaderRow().run())}
                />
                <MenuItemSelectable
                  label="Header column"
                  selected={headerColumnOn}
                  disabled={!menuState.canToggleHeaderColumn}
                  onChange={runAndClose(() => editor.chain().focus().toggleHeaderColumn().run())}
                />
                <MenuItemSelectable
                  label="Borders"
                  selected={bordersOn}
                  onChange={runAndClose(() =>
                    editor.chain().focus().updateAttributes("table", { borderless: bordersOn }).run()
                  )}
                />
                <MenuItemDivider />
                <MenuItemRadioGroup
                  label="Cell vertical alignment"
                  items={["top", "middle", "bottom"]}
                  itemToString={(item) => `Align ${String(item)}`}
                  selectedItem={cellVertical}
                  onChange={runAndClose((...args: unknown[]) => {
                    const next = normalizeVerticalAlignment(args[0]) ?? "middle";
                    editor
                      .chain()
                      .focus()
                      .setCellAttribute("verticalAlignment", next === "middle" ? null : next)
                      .run();
                  })}
                />
              </MenuItem>
              <MenuItemDivider />
              <MenuItem
                label="Delete table"
                kind="danger"
                renderIcon={TrashCan}
                disabled={!menuState.canDeleteTable}
                onClick={runAndClose(() => editor.chain().focus().deleteTable().run())}
              />
            </Menu>,
            document.body
          )
        : null}
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
