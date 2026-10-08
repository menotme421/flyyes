import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Checkmark,
  Code,
  DocumentConfiguration,
  Link,
  ListChecked,
  OverflowMenuVertical,
  PageBreak,
  Quotes,
  Search,
  TextIndentLess,
  TextIndentMore,
  TextStrikethrough,
  TextSubscript,
  TextSuperscript,
  TrashCan,
} from "@carbon/icons-react";
import { Button, Dropdown, IconButton, Popover, PopoverContent } from "@carbon/react";
import { LayoutListMove } from "@/components/icons/layout-list-move";
import { SheetColumnLeft } from "@/components/icons/sheet-column-left";
import { SheetColumnRight } from "@/components/icons/sheet-column-right";
import { SheetRowBelow } from "@/components/icons/sheet-row-below";
import { TableStudioIcon } from "@/components/icons/table-studio";
import { TableCellsMergeIcon } from "@/components/icons/table-cells-merge";
import { TableCellsSplitIcon } from "@/components/icons/table-cells-split";
import { PageSetupDialog } from "@/components/PageSetupDialog";
import { UrlDialog } from "@/components/UrlDialog";
import { ZoomSelect } from "@/components/ZoomSelect";
import type { ResolvedPageSetup } from "@/services/pageSetupService";
import type { PageOrientation } from "@/storage/documentTypes";
import { ImageMenu, TableInsert } from "./InsertMenu";

// WHY: Right-zone swap cluster (single responsibility) — every non-core tool
// lives here, grouped by selection context. EditorToolbar owns the core row
// and the swap switch; this file owns what each context shows. Commands and
// dialogs are reused from TableContextMenu/InsertMenu/UrlDialog — nothing is
// reimplemented, so the bar and the right-click menu can never diverge.

export type ToolbarContext = "default" | "image" | "table" | "link";

const LINE_SPACINGS = ["1.0", "1.15", "1.5", "2.0"] as const;
const IMAGE_WIDTH_PRESETS = [25, 50, 75, 100] as const;

/**
 * Which right-zone panel the selection earns. Priority is deliberate:
 * image beats table (an image node selection is never "in" a table for
 * tool purposes), table beats link. Pure so it is unit-testable.
 */
export function resolveToolbarContext(flags: {
  imageSelected: boolean;
  inTable: boolean;
  linkActive: boolean;
}): ToolbarContext {
  if (flags.imageSelected) return "image";
  if (flags.inTable) return "table";
  if (flags.linkActive) return "link";
  return "default";
}

// Snapshot slices mirror EditorToolbar's toolbarState field names exactly so
// the full snapshot object can be passed straight through (structural typing
// accepts the wider object). No new subscription is created here.
export interface DefaultSecondarySnapshot {
  strike: boolean;
  lineHeight: string | undefined;
  indented: boolean;
  taskList: boolean;
  subscript: boolean;
  superscript: boolean;
  blockquote: boolean;
  codeBlock: boolean;
}

export interface TableContextSnapshot {
  canAddRowBefore: boolean;
  canAddRowAfter: boolean;
  canDeleteRow: boolean;
  canAddColumnBefore: boolean;
  canAddColumnAfter: boolean;
  canDeleteColumn: boolean;
  canMergeCells: boolean;
  canSplitCell: boolean;
  canToggleHeaderRow: boolean;
  canDeleteTable: boolean;
  headerRowOn: boolean;
}

export interface LinkContextSnapshot {
  link: boolean;
  selectionEmpty: boolean;
  linkHref: string | undefined;
}

export function ToolbarSeparator() {
  return <div aria-hidden="true" className="fly-separator" />;
}

function ContextButton({ title, active, disabled, onClick, children }: {
  title: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // WHY: Same Carbon IconButton chrome as the core row (tooltip + selected
  // state) so swapped panels read as the same bar, not a different UI.
  return (
    <IconButton kind="ghost" size="sm" label={title} align="bottom" isSelected={active} disabled={disabled} onClick={onClick}>
      {children}
    </IconButton>
  );
}

export interface LinkButtonProperties {
  editor: Editor;
  linkActive: boolean;
  selectionEmpty: boolean;
  previousLinkHref?: string;
}

// WHY: Link promoted out of Insert into its own toolbar button (most-used
// insert by far). Same dialog + validation in core and in the link panel.
export function LinkButton({ editor, linkActive, selectionEmpty, previousLinkHref }: LinkButtonProperties) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <>
      <ContextButton title="Link…" active={linkActive} onClick={() => setDialogOpen(true)}>
        <Link />
      </ContextButton>
      <UrlDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Insert link"
        description={
          selectionEmpty
            ? "No text selected — the link will be inserted at the cursor."
            : "Link the selected text."
        }
        placeholder="https://…"
        initialValue={previousLinkHref ?? ""}
        submitLabel={selectionEmpty ? "Insert link" : "Apply link"}
        allowEmpty
        showRemove={linkActive}
        removeLabel="Remove link"
        onRemove={() => editor.chain().focus().unsetLink().run()}
        validate={(url) => {
          if (url === "") {
            return selectionEmpty ? "Type or paste a link first." : null;
          }
          return /^https?:\/\/|^mailto:/i.test(url)
            ? null
            : "Only https:// and mailto: links are allowed.";
        }}
        onSubmit={(url) => {
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          if (selectionEmpty) {
            // WHY: Collapsed caret can't hold a mark visibly — insert the URL
            // as linked text (Word behavior) instead of silently arming
            // link-on-type, which confused everyone.
            editor
              .chain()
              .focus()
              .insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] })
              .run();
          } else {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
      />
    </>
  );
}

export interface DefaultSecondaryProperties {
  editor: Editor;
  snapshot: DefaultSecondarySnapshot;
  pageSetup: ResolvedPageSetup;
  onPageSetupChange: (presetId: string, orientation: PageOrientation) => void;
  pageSetupOpen: boolean;
  onPageSetupOpenChange: (open: boolean) => void;
  zoomPercent: number;
  onZoomChange: (nextZoom: number) => void;
  onSearchOpen: () => void;
}

// WHY: The resting right zone — document/search/insert/advanced tools that
// are not object-specific. Unchanged from the pre-swap bar, only relocated,
// so this step is pure rearrangement with no behavior delta.
export function DefaultSecondaryTools({
  editor,
  snapshot,
  pageSetup,
  onPageSetupChange,
  pageSetupOpen,
  onPageSetupOpenChange,
  zoomPercent,
  onZoomChange,
  onSearchOpen,
}: DefaultSecondaryProperties) {
  return (
    <>
      <div className="flex items-center gap-0">
        <ContextButton title="Find and replace (Ctrl+F)" active={false} onClick={onSearchOpen}>
          <Search />
        </ContextButton>
        <ContextButton title="Page setup (paper presets)" active={false} onClick={() => onPageSetupOpenChange(true)}>
          <DocumentConfiguration />
        </ContextButton>
        <PageSetupDialog
          open={pageSetupOpen}
          onClose={() => onPageSetupOpenChange(false)}
          initialPresetId={pageSetup.presetId}
          initialOrientation={pageSetup.landscape ? "landscape" : "portrait"}
          onSave={onPageSetupChange}
        />
        <div className="w-28 shrink-0">
          <ZoomSelect zoomPercent={zoomPercent} onZoomChange={onZoomChange} />
        </div>
      </div>

      <ToolbarSeparator />

      <div className="flex items-center gap-0 [&>*]:shrink-0">
        <ImageMenu editor={editor} />
        <TableInsert editor={editor} />
        <ContextButton title="Page break" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <PageBreak />
        </ContextButton>
      </div>

      <ToolbarSeparator />

      <div className="flex flex-wrap items-center gap-0 [&>*]:shrink-0">
        <ContextButton title="Strikethrough" active={snapshot.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <TextStrikethrough />
        </ContextButton>
        <div className="fly-roomy-menu-md w-28">
          <Dropdown
            id="line-spacing"
            titleText="Line spacing"
            hideLabel
            type="inline"
            label="Spacing"
            size="sm"
            items={["1.7 (Default)", ...LINE_SPACINGS]}
            selectedItem={snapshot.lineHeight ?? "1.7 (Default)"}
            renderSelectedItem={(item) => (
              <span className="flex items-center gap-1.5">
                <LayoutListMove className="h-4 w-4 shrink-0" />
                <span>{item === "1.7 (Default)" ? "1.7" : item}</span>
              </span>
            )}
            onChange={(data) => {
              const spacing = data.selectedItem;
              if (!spacing || spacing === "1.7 (Default)") editor.chain().focus().unsetLineHeight().run();
              else editor.chain().focus().setLineHeight(spacing).run();
            }}
          />
        </div>
        <ContextButton title="Decrease indent" active={false} onClick={() => editor.commands.decreaseIndent()}>
          <TextIndentLess />
        </ContextButton>
        <ContextButton title="Increase indent" active={snapshot.indented} onClick={() => editor.commands.increaseIndent()}>
          <TextIndentMore />
        </ContextButton>
        <ContextButton title="Task list" active={snapshot.taskList} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <ListChecked />
        </ContextButton>
      </div>
      <div className="flex shrink-0 items-center">
        <FormatOverflow editor={editor} snapshot={snapshot} />
      </div>
    </>
  );
}

// WHY: Object properties surface only while their object is selected —
// otherwise they stay hidden and the bar keeps the default set. Same
// commands as TableContextMenu (single source of truth for what each
// action does); this panel only changes where they are reachable.
export function ImageContextTools({ editor, imageWidth }: {
  editor: Editor;
  imageWidth: number | null;
}) {
  // WHY: Unset width renders full-bleed (see ResizableImage), so null reads
  // as 100% and the 100% preset shows active instead of nothing active.
  const currentWidth = imageWidth ?? 100;
  return (
    <>
      <div className="flex items-center gap-0 [&>*]:shrink-0" role="group" aria-label="Image size">
        {IMAGE_WIDTH_PRESETS.map((preset) => (
          <Button
            key={preset}
            kind="ghost"
            size="sm"
            isSelected={currentWidth === preset}
            onClick={() => editor.chain().focus().updateAttributes("image", { width: preset }).run()}
          >
            {preset}%
          </Button>
        ))}
      </div>
      <ToolbarSeparator />
      <div className="flex items-center gap-0 [&>*]:shrink-0">
        <ImageMenu editor={editor} />
        <ContextButton title="Delete image" active={false} onClick={() => editor.chain().focus().deleteSelection().run()}>
          <TrashCan />
        </ContextButton>
      </div>
    </>
  );
}

export function TableContextTools({ editor, snapshot }: {
  editor: Editor;
  snapshot: TableContextSnapshot;
}) {
  return (
    <>
      <div className="flex items-center gap-0 [&>*]:shrink-0" role="group" aria-label="Table rows">
        {/* WHY: Studio-glyph trial for Row above — revert to SheetRowAbove
            if rejected (trial, not a decision). */}
        <ContextButton title="Row above" active={false} disabled={!snapshot.canAddRowBefore} onClick={() => editor.chain().focus().addRowBefore().run()}>
          <TableStudioIcon />
        </ContextButton>
        <ContextButton title="Row below" active={false} disabled={!snapshot.canAddRowAfter} onClick={() => editor.chain().focus().addRowAfter().run()}>
          <SheetRowBelow />
        </ContextButton>
        <ContextButton title="Delete row" active={false} disabled={!snapshot.canDeleteRow} onClick={() => editor.chain().focus().deleteRow().run()}>
          <TrashCan />
        </ContextButton>
      </div>
      <ToolbarSeparator />
      <div className="flex items-center gap-0 [&>*]:shrink-0" role="group" aria-label="Table columns">
        <ContextButton title="Column left" active={false} disabled={!snapshot.canAddColumnBefore} onClick={() => editor.chain().focus().addColumnBefore().run()}>
          <SheetColumnLeft />
        </ContextButton>
        <ContextButton title="Column right" active={false} disabled={!snapshot.canAddColumnAfter} onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <SheetColumnRight />
        </ContextButton>
        <ContextButton title="Delete column" active={false} disabled={!snapshot.canDeleteColumn} onClick={() => editor.chain().focus().deleteColumn().run()}>
          <TrashCan />
        </ContextButton>
      </div>
      <ToolbarSeparator />
      <div className="flex items-center gap-0 [&>*]:shrink-0" role="group" aria-label="Table cells">
        <ContextButton title="Merge cells" active={false} disabled={!snapshot.canMergeCells} onClick={() => editor.chain().focus().mergeCells().run()}>
          <TableCellsMergeIcon />
        </ContextButton>
        <ContextButton title="Split cell" active={false} disabled={!snapshot.canSplitCell} onClick={() => editor.chain().focus().splitCell().run()}>
          <TableCellsSplitIcon />
        </ContextButton>
        <ContextButton title="Header row" active={snapshot.headerRowOn} disabled={!snapshot.canToggleHeaderRow} onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
          <Checkmark />
        </ContextButton>
        <ContextButton title="Delete table" active={false} disabled={!snapshot.canDeleteTable} onClick={() => editor.chain().focus().deleteTable().run()}>
          <TrashCan />
        </ContextButton>
      </div>
    </>
  );
}

export function LinkContextTools({ editor, snapshot }: {
  editor: Editor;
  snapshot: LinkContextSnapshot;
}) {
  return (
    <div className="flex items-center gap-0 [&>*]:shrink-0">
      <LinkButton
        editor={editor}
        linkActive={snapshot.link}
        selectionEmpty={snapshot.selectionEmpty}
        previousLinkHref={snapshot.linkHref}
      />
      {snapshot.link ? (
        <ContextButton title="Remove link" active={false} onClick={() => editor.chain().focus().unsetLink().run()}>
          <TrashCan />
        </ContextButton>
      ) : null}
    </div>
  );
}

// WHY: Overflow holds only the specialists — character modifiers
// (sub/superscript) and block containers (quote, code). Everything else
// earned a ribbon slot, so this panel stays short.
function FormatOverflow({ editor, snapshot }: {
  editor: Editor;
  snapshot: DefaultSecondarySnapshot;
}) {
  const [open, setOpen] = useState(false);

  function closeAnd(run: () => void): () => void {
    return () => {
      run();
      setOpen(false);
    };
  }

  return (
    <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-end" caret>
      <IconButton
        kind="ghost"
        size="sm"
        label="More formatting"
        align="bottom"
        onClick={() => setOpen((currently) => !currently)}
      >
        <OverflowMenuVertical />
      </IconButton>
      <PopoverContent className="fly-popover-panel w-64">
        <OverflowRow
          icon={<TextSubscript />}
          label="Subscript"
          checked={snapshot.subscript}
          onClick={closeAnd(() => editor.chain().focus().toggleSubscript().run())}
        />
        <OverflowRow
          icon={<TextSuperscript />}
          label="Superscript"
          checked={snapshot.superscript}
          onClick={closeAnd(() => editor.chain().focus().toggleSuperscript().run())}
        />
        <OverflowRow
          icon={<Quotes />}
          label="Quote"
          checked={snapshot.blockquote}
          onClick={closeAnd(() => editor.chain().focus().toggleBlockquote().run())}
        />
        <OverflowRow
          icon={<Code />}
          label="Code block"
          checked={snapshot.codeBlock}
          onClick={closeAnd(() => editor.chain().focus().toggleCodeBlock().run())}
        />
      </PopoverContent>
    </Popover>
  );
}

function OverflowRow({ icon, label, checked, onClick }: {
  icon: React.ReactNode;
  label: string;
  checked?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className="fly-menu-row text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <span className="text-muted-foreground [&>svg]:block [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {checked ? <Checkmark aria-label="On" /> : null}
    </button>
  );
}
