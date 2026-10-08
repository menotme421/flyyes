import { Fragment, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  BorderFull,
  Checkmark,
  Code,
  ColorPalette,
  Column,
  DocumentConfiguration,
  Link,
  ListChecked,
  OverflowMenuVertical,
  PageBreak,
  Quotes,
  Row,
  Search,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextIndentLess,
  TextIndentMore,
  TextStrikethrough,
  TextSubscript,
  TextSuperscript,
  TrashCan,
} from "@carbon/icons-react";
import { Button, Dropdown, IconButton, Popover, PopoverContent } from "@carbon/react";
import { ColorPicker } from "@/components/ColorPicker";
import { LayoutListMove } from "@/components/icons/layout-list-move";
import { SheetColumnLeft } from "@/components/icons/sheet-column-left";
import { SheetColumnRight } from "@/components/icons/sheet-column-right";
import { SheetRowAbove } from "@/components/icons/sheet-row-above";
import { SheetRowBelow } from "@/components/icons/sheet-row-below";
import { TableCellsMergeIcon } from "@/components/icons/table-cells-merge";
import { TableCellsSplitIcon } from "@/components/icons/table-cells-split";
import { PageSetupDialog } from "@/components/PageSetupDialog";
import { UrlDialog } from "@/components/UrlDialog";
import { ZoomSelect } from "@/components/ZoomSelect";
import type { ResolvedPageSetup } from "@/services/pageSetupService";
import type { PageOrientation } from "@/storage/documentTypes";
import type { TableAlignment } from "./tablePropertiesExtension";
import { ImageMenu, TableInsert } from "./InsertMenu";

// WHY: Right-zone swap cluster (single responsibility) — every non-core tool
// lives here, grouped by selection context. EditorToolbar owns the core row
// and the swap switch; this file owns what each context shows. Commands and
// dialogs are reused from TableContextMenu/InsertMenu/UrlDialog — nothing is
// reimplemented, so the bar and the right-click menu can never diverge.

const LINE_SPACINGS = ["1.0", "1.15", "1.5", "2.0"] as const;
const IMAGE_WIDTH_PRESETS = [25, 50, 75, 100] as const;

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
  canToggleHeaderColumn: boolean;
  canDeleteTable: boolean;
  headerRowOn: boolean;
  headerColumnOn: boolean;
  cellFill: string | null;
  bordersOn: boolean;
  tableAlignment: TableAlignment;
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

// WHY: Single-source tools for the responsive overflow — one def renders the
// bar button AND the overflow-menu row, so collapsed tools stay reachable
// without duplicating labels, icons, or commands (copies would diverge).
// Only plain command buttons collapse; dropdowns, popovers, and dialogs are
// fixed (rebuilding floating UI inside a menu is fragile).
export interface OverflowBarTool {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "text";
  active: boolean;
  disabled?: boolean;
  run: () => void;
}

export interface OverflowBarGroup {
  id: string;
  sectionLabel: string;
  priority: number;
  tools: OverflowBarTool[];
}

function BarToolButton({ tool }: { tool: OverflowBarTool }) {
  if (tool.variant === "text") {
    return (
      <Button kind="ghost" size="sm" isSelected={tool.active} disabled={tool.disabled} onClick={tool.run}>
        {tool.label}
      </Button>
    );
  }
  return (
    <ContextButton title={tool.label} active={tool.active} disabled={tool.disabled} onClick={tool.run}>
      {tool.icon}
    </ContextButton>
  );
}

function BarGroup({ group }: { group: OverflowBarGroup }) {
  // WHY: No wrapping here — an overflowing group must push the ribbon's
  // scrollWidth (the collapse signal), never wrap and hide the overflow.
  return (
    <div className="flex flex-nowrap items-center gap-0 [&>*]:shrink-0" role="group" aria-label={group.sectionLabel}>
      {group.tools.map((tool) => (
        <BarToolButton key={tool.id} tool={tool} />
      ))}
    </div>
  );
}

interface PanelBlock {
  key: string;
  node: React.ReactNode;
}

// WHY: Separators only between VISIBLE blocks — hiding a group must never
// leave a leading divider or a doubled one.
function joinBlocks(blocks: (PanelBlock | false | null | undefined)[]) {
  const visible = blocks.filter((block): block is PanelBlock => Boolean(block));
  return visible.map((block, index) => (
    <Fragment key={block.key}>
      {index > 0 ? <ToolbarSeparator /> : null}
      {block.node}
    </Fragment>
  ));
}

function PanelOverflowMenu({ label, sections }: {
  label: string;
  sections: { heading: string; tools: OverflowBarTool[] }[];
}) {
  const [open, setOpen] = useState(false);
  const hiddenCount = sections.reduce((count, section) => count + section.tools.length, 0);
  return (
    <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-end" caret>
      <IconButton
        kind="ghost"
        size="sm"
        label={hiddenCount > 0 ? `${label} (${hiddenCount} more)` : label}
        align="bottom"
        onClick={() => setOpen((currently) => !currently)}
      >
        <OverflowMenuVertical />
      </IconButton>
      <PopoverContent className="fly-popover-panel w-64">
        {sections.map((section) => (
          <div key={section.heading}>
            <p className="cds--type-label-02 fly-menu-label text-muted-foreground">{section.heading}</p>
            {section.tools.map((tool) => (
              <OverflowRow
                key={tool.id}
                icon={tool.icon}
                label={tool.label}
                checked={tool.active}
                disabled={tool.disabled}
                onClick={() => {
                  tool.run();
                  setOpen(false);
                }}
              />
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
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
  hiddenIds: string[];
}

// WHY: The resting right zone — document/search/insert/advanced tools that
// are not object-specific. Collapsible command groups hide into the overflow
// menu by priority when the bar narrows; dropdowns, popovers, and dialogs
// stay put (rebuilding floating UI inside a menu is fragile).
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
  hiddenIds,
}: DefaultSecondaryProperties) {
  const groups: OverflowBarGroup[] = [
    {
      id: "search",
      sectionLabel: "Search",
      priority: 60,
      tools: [{ id: "search", label: "Find and replace (Ctrl+F)", icon: <Search />, active: false, run: onSearchOpen }],
    },
    {
      id: "pagebreak",
      sectionLabel: "Page break",
      priority: 10,
      tools: [{
        id: "pagebreak",
        label: "Page break",
        icon: <PageBreak />,
        active: false,
        run: () => editor.chain().focus().setHorizontalRule().run(),
      }],
    },
    {
      id: "textstyle",
      sectionLabel: "Text style",
      priority: 20,
      tools: [
        { id: "strike", label: "Strikethrough", icon: <TextStrikethrough />, active: snapshot.strike, run: () => editor.chain().focus().toggleStrike().run() },
        { id: "task", label: "Task list", icon: <ListChecked />, active: snapshot.taskList, run: () => editor.chain().focus().toggleTaskList().run() },
      ],
    },
    {
      id: "indents",
      sectionLabel: "Indent",
      priority: 15,
      tools: [
        { id: "outdent", label: "Decrease indent", icon: <TextIndentLess />, active: false, run: () => editor.commands.decreaseIndent() },
        { id: "indent", label: "Increase indent", icon: <TextIndentMore />, active: snapshot.indented, run: () => editor.commands.increaseIndent() },
      ],
    },
  ];
  const hiddenSections = groups
    .filter((group) => hiddenIds.includes(group.id))
    .map((group) => ({ heading: group.sectionLabel, tools: group.tools }));
  const visible = (id: string) => !hiddenIds.includes(id);

  return (
    <>
      {joinBlocks([
        visible("search") && {
          key: "search",
          node: <BarGroup group={groups.find((group) => group.id === "search")!} />,
        },
        {
          key: "doc",
          node: (
            // WHY: Small gap between setup and zoom (user call) — search
            // lives in its own collapsible group above (single source; a
            // second copy here once duplicated it into two magnifiers).
            <div className="flex items-center gap-1">
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
          ),
        },
        {
          key: "insert",
          node: (
            <div className="flex items-center gap-0 [&>*]:shrink-0">
              <ImageMenu editor={editor} />
              <TableInsert editor={editor} />
            </div>
          ),
        },
        visible("pagebreak") && {
          key: "pagebreak",
          node: <BarGroup group={groups.find((group) => group.id === "pagebreak")!} />,
        },
        {
          key: "spacing",
          node: (
            <div className="fly-roomy-menu-md w-28 shrink-0">
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
          ),
        },
        visible("textstyle") && {
          key: "textstyle",
          node: <BarGroup group={groups.find((group) => group.id === "textstyle")!} />,
        },
        visible("indents") && {
          key: "indents",
          node: <BarGroup group={groups.find((group) => group.id === "indents")!} />,
        },
        {
          key: "overflow",
          node: (
            <PanelOverflowMenu
              label="More formatting"
              sections={[...hiddenSections, { heading: "More formatting", tools: specialistTools(editor, snapshot) }]}
            />
          ),
        },
      ])}
    </>
  );
}

// WHY: Object properties surface only while their object is selected —
// otherwise they stay hidden and the bar keeps the default set. Same
// commands as TableContextMenu (single source of truth for what each
// action does); this panel only changes where they are reachable.
export function ImageContextTools({ editor, imageWidth, hiddenIds }: {
  editor: Editor;
  imageWidth: number | null;
  hiddenIds: string[];
}) {
  // WHY: Unset width renders full-bleed (see ResizableImage), so null reads
  // as 100% and the 100% preset shows active instead of nothing active.
  const currentWidth = imageWidth ?? 100;
  const sizesGroup: OverflowBarGroup = {
    id: "sizes",
    sectionLabel: "Image size",
    priority: 10,
    tools: IMAGE_WIDTH_PRESETS.map((preset) => ({
      id: `size-${preset}`,
      label: `${preset}%`,
      variant: "text" as const,
      active: currentWidth === preset,
      run: () => editor.chain().focus().updateAttributes("image", { width: preset }).run(),
    })),
  };
  const deleteGroup: OverflowBarGroup = {
    id: "imagedelete",
    sectionLabel: "Image",
    priority: 50,
    tools: [{ id: "delete", label: "Delete image", icon: <TrashCan />, active: false, run: () => editor.chain().focus().deleteSelection().run() }],
  };
  const visible = (id: string) => !hiddenIds.includes(id);
  const hiddenSections = [sizesGroup, deleteGroup]
    .filter((group) => hiddenIds.includes(group.id))
    .map((group) => ({ heading: group.sectionLabel, tools: group.tools }));

  return (
    <>
      {joinBlocks([
        visible("sizes") && { key: "sizes", node: <BarGroup group={sizesGroup} /> },
        {
          key: "replace",
          node: (
            <div className="flex items-center gap-0 [&>*]:shrink-0">
              <ImageMenu editor={editor} />
            </div>
          ),
        },
        visible("imagedelete") && { key: "imagedelete", node: <BarGroup group={deleteGroup} /> },
        hiddenSections.length > 0 && {
          key: "overflow",
          node: <PanelOverflowMenu label="More tools" sections={hiddenSections} />,
        },
      ])}
    </>
  );
}

export function TableContextTools({ editor, snapshot, hiddenIds }: {
  editor: Editor;
  snapshot: TableContextSnapshot;
  hiddenIds: string[];
}) {
  const groups: OverflowBarGroup[] = [
    {
      id: "rows",
      sectionLabel: "Table rows",
      priority: 50,
      tools: [
        { id: "rowabove", label: "Row above", icon: <SheetRowAbove />, active: false, disabled: !snapshot.canAddRowBefore, run: () => editor.chain().focus().addRowBefore().run() },
        { id: "rowbelow", label: "Row below", icon: <SheetRowBelow />, active: false, disabled: !snapshot.canAddRowAfter, run: () => editor.chain().focus().addRowAfter().run() },
        { id: "deleterow", label: "Delete row", icon: <TrashCan />, active: false, disabled: !snapshot.canDeleteRow, run: () => editor.chain().focus().deleteRow().run() },
      ],
    },
    {
      id: "cols",
      sectionLabel: "Table columns",
      priority: 40,
      tools: [
        { id: "colleft", label: "Column left", icon: <SheetColumnLeft />, active: false, disabled: !snapshot.canAddColumnBefore, run: () => editor.chain().focus().addColumnBefore().run() },
        { id: "colright", label: "Column right", icon: <SheetColumnRight />, active: false, disabled: !snapshot.canAddColumnAfter, run: () => editor.chain().focus().addColumnAfter().run() },
        { id: "deletecol", label: "Delete column", icon: <TrashCan />, active: false, disabled: !snapshot.canDeleteColumn, run: () => editor.chain().focus().deleteColumn().run() },
      ],
    },
    {
      id: "cells",
      sectionLabel: "Table cells",
      priority: 30,
      tools: [
        { id: "merge", label: "Merge cells", icon: <TableCellsMergeIcon />, active: false, disabled: !snapshot.canMergeCells, run: () => editor.chain().focus().mergeCells().run() },
        { id: "split", label: "Split cell", icon: <TableCellsSplitIcon />, active: false, disabled: !snapshot.canSplitCell, run: () => editor.chain().focus().splitCell().run() },
        // WHY: Row/Column glyphs (not two checkmarks) so the pair scans as
        // distinct targets — tooltips carry the full meaning.
        { id: "headerrow", label: "Header row", icon: <Row />, active: snapshot.headerRowOn, disabled: !snapshot.canToggleHeaderRow, run: () => editor.chain().focus().toggleHeaderRow().run() },
        { id: "headercol", label: "Header column", icon: <Column />, active: snapshot.headerColumnOn, disabled: !snapshot.canToggleHeaderColumn, run: () => editor.chain().focus().toggleHeaderColumn().run() },
        { id: "deletetable", label: "Delete table", icon: <TrashCan />, active: false, disabled: !snapshot.canDeleteTable, run: () => editor.chain().focus().deleteTable().run() },
      ],
    },
    {
      id: "tablealign",
      sectionLabel: "Table alignment",
      priority: 10,
      tools: [
        { id: "alignleft", label: "Align table left", icon: <TextAlignLeft />, active: snapshot.tableAlignment === "left", run: () => editor.chain().focus().updateAttributes("table", { tableAlignment: null }).run() },
        { id: "aligncenter", label: "Align table center", icon: <TextAlignCenter />, active: snapshot.tableAlignment === "center", run: () => editor.chain().focus().updateAttributes("table", { tableAlignment: "center" }).run() },
        { id: "alignright", label: "Align table right", icon: <TextAlignRight />, active: snapshot.tableAlignment === "right", run: () => editor.chain().focus().updateAttributes("table", { tableAlignment: "right" }).run() },
      ],
    },
    {
      id: "borders",
      sectionLabel: "Borders",
      priority: 15,
      tools: [{
        id: "borders",
        label: "Borders",
        icon: <BorderFull />,
        active: snapshot.bordersOn,
        run: () => editor.chain().focus().updateAttributes("table", { borderless: snapshot.bordersOn }).run(),
      }],
    },
    {
      id: "deletetable",
      sectionLabel: "Table",
      priority: 60,
      tools: [{ id: "deletetable", label: "Delete table", icon: <TrashCan />, active: false, disabled: !snapshot.canDeleteTable, run: () => editor.chain().focus().deleteTable().run() }],
    },
  ];
  const hiddenSections = groups
    .filter((group) => hiddenIds.includes(group.id))
    .map((group) => ({ heading: group.sectionLabel, tools: group.tools }));
  const visible = (id: string) => !hiddenIds.includes(id);
  const groupById = (id: string) => groups.find((group) => group.id === id)!;

  return (
    <>
      {joinBlocks([
        visible("rows") && { key: "rows", node: <BarGroup group={groupById("rows")} /> },
        visible("cols") && { key: "cols", node: <BarGroup group={groupById("cols")} /> },
        visible("cells") && { key: "cells", node: <BarGroup group={groupById("cells")} /> },
        {
          key: "fill",
          node: (
            <div className="flex items-center gap-0 [&>*]:shrink-0" role="group" aria-label="Cell fill">
        <ColorPicker
          title="Cell fill"
          value={snapshot.cellFill}
          onSelect={(hex) => editor.chain().focus().setCellAttribute("backgroundColor", hex).run()}
          onClear={() => editor.chain().focus().setCellAttribute("backgroundColor", null).run()}
          clearLabel="No fill"
          align="bottom-end"
        >
                <IconButton kind="ghost" size="sm" label="Cell fill" align="bottom">
                  <span className="flex flex-col items-center leading-none">
                    <ColorPalette className="h-4 w-4" />
                    <span
                      aria-hidden="true"
                      className="fly-color-bar h-1 w-4 rounded-sm"
                      style={{ backgroundColor: snapshot.cellFill ?? "transparent" }}
                    />
                  </span>
                </IconButton>
              </ColorPicker>
            </div>
          ),
        },
        visible("borders") && { key: "borders", node: <BarGroup group={groupById("borders")} /> },
        visible("tablealign") && { key: "tablealign", node: <BarGroup group={groupById("tablealign")} /> },
        hiddenSections.length > 0 && {
          key: "overflow",
          node: <PanelOverflowMenu label="More tools" sections={hiddenSections} />,
        },
      ])}
    </>
  );
}

export function LinkContextTools({ editor, snapshot, hiddenIds }: {
  editor: Editor;
  snapshot: LinkContextSnapshot;
  hiddenIds: string[];
}) {
  const removeGroup: OverflowBarGroup = {
    id: "removelink",
    sectionLabel: "Link",
    priority: 10,
    tools: [
      {
        id: "removelink",
        label: "Remove link",
        icon: <TrashCan />,
        active: false,
        run: () => editor.chain().focus().unsetLink().run(),
      },
    ],
  };
  const hiddenSections = hiddenIds.includes("removelink")
    ? [{ heading: removeGroup.sectionLabel, tools: removeGroup.tools }]
    : [];
  return (
    <>
      {joinBlocks([
        {
          key: "edit",
          node: (
            <div className="flex items-center gap-0 [&>*]:shrink-0">
              <LinkButton
                editor={editor}
                linkActive={snapshot.link}
                selectionEmpty={snapshot.selectionEmpty}
                previousLinkHref={snapshot.linkHref}
              />
            </div>
          ),
        },
        snapshot.link && !hiddenIds.includes("removelink") && {
          key: "removelink",
          node: <BarGroup group={removeGroup} />,
        },
        hiddenSections.length > 0 && {
          key: "overflow",
          node: <PanelOverflowMenu label="More tools" sections={hiddenSections} />,
        },
      ])}
    </>
  );
}

// WHY: Specialists live here permanently (character modifiers and block
// containers never earned a ribbon slot) — collapsed groups join them above
// when the bar narrows, so this menu is both the overflow anchor and the
// responsive overflow home.
function specialistTools(editor: Editor, snapshot: DefaultSecondarySnapshot): OverflowBarTool[] {
  return [
    { id: "subscript", label: "Subscript", icon: <TextSubscript />, active: snapshot.subscript, run: () => editor.chain().focus().toggleSubscript().run() },
    { id: "superscript", label: "Superscript", icon: <TextSuperscript />, active: snapshot.superscript, run: () => editor.chain().focus().toggleSuperscript().run() },
    { id: "quote", label: "Quote", icon: <Quotes />, active: snapshot.blockquote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { id: "codeblock", label: "Code block", icon: <Code />, active: snapshot.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
  ];
}

function OverflowRow({ icon, label, checked, disabled, onClick }: {
  icon?: React.ReactNode;
  label: string;
  checked?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      disabled={disabled}
      className="fly-menu-row text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
    >
      <span className="text-muted-foreground [&>svg]:block [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {checked ? <Checkmark aria-label="On" /> : null}
    </button>
  );
}
