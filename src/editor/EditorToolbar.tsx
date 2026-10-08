import { useEditorState, type Editor } from "@tiptap/react";
import { useState } from "react";
import {
  ListBulleted,
  ListNumbered,
  Redo,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  TextBold,
  TextClearFormat,
  TextHighlight,
  TextItalic,
  TextUnderline,
  Undo,
} from "@carbon/icons-react";
import { Dropdown, IconButton } from "@carbon/react";
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, WORD_FONT_FAMILIES, WORD_FONT_SIZES } from "@/editor/editorExtensions";
import { ColorPicker } from "@/components/ColorPicker";
import type { ResolvedPageSetup } from "@/services/pageSetupService";
import type { PageOrientation } from "@/storage/documentTypes";
import { normalizeTableAlignment } from "./tablePropertiesExtension";
import { isHeaderColumnActive, isHeaderRowActive, isSelectionInTable } from "./tableSelection";
import {
  DefaultSecondaryTools,
  ImageContextTools,
  LinkButton,
  LinkContextTools,
  TableContextTools,
  ToolbarSeparator,
  resolveToolbarContext,
} from "./ContextTools";

// WHY: Ribbon order — history, Styles, Font essentials, Paragraph essentials
// left (core, always visible); the right cluster swaps by selection (see
// ContextTools). Rarely-used tools live in the More panel (Carbon
// text-toolbar overflow pattern) so the bar never scrolls — scrolling would
// trap Carbon's floating menus inside it. Sizing utilities stay on plain
// wrapper divs, never on Carbon roots (Carbon's unlayered CSS beats Tailwind
// utilities on the same element).

// WHY: Unset state shows the real family with a (default) tag — "Font" alone
// told the user nothing about what they were getting.
const FONT_UNSET_LABEL = `${DEFAULT_FONT_FAMILY} (default)`;
// WHY: Same honesty for size — the unset value renders at 16px.
const SIZE_UNSET_LABEL = `${DEFAULT_FONT_SIZE.replace("px", "")} (default)`;

// WHY: Trigger display strips the honest "(Default)" suffix — the open menu
// keeps the full label, so nothing is hidden, just shortened on the bar.
function shortTriggerLabel(item: string): string {
  return item.replace(/ \(default\)$/i, "");
}
const PARAGRAPH_STYLES = [
  "Normal text",
  "Heading 1",
  "Heading 2",
  "Heading 3",
  "Heading 4",
  "Heading 5",
  "Heading 6",
];

interface EditorToolbarProperties {
  editor: Editor;
  pageSetup: ResolvedPageSetup;
  onPageSetupChange: (presetId: string, orientation: PageOrientation) => void;
  zoomPercent: number;
  onZoomChange: (nextZoom: number) => void;
  onSearchOpen: () => void;
}

export function EditorToolbar({
  editor,
  pageSetup,
  onPageSetupChange,
  zoomPercent,
  onZoomChange,
  onSearchOpen,
}: EditorToolbarProperties) {
  // WHY: Dialog state lives in the toolbar (its openers live here) —
  // margins stay controlled by the page above (single source of truth).
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  // WHY: Live snapshot of selection-dependent state (marks, alignment, fonts,
  // headings, line height). Without this the toolbar only refreshed when the
  // debounced autosave re-rendered the page — dropdowns looked stuck.
  const toolbarState = useEditorState({
    editor,
    selector: (snapshot) => {
      const liveEditor = snapshot.editor;
      const textStyle = liveEditor.getAttributes("textStyle") as Record<string, string | undefined>;
      return {
        bold: liveEditor.isActive("bold"),
        italic: liveEditor.isActive("italic"),
        underline: liveEditor.isActive("underline"),
        strike: liveEditor.isActive("strike"),
        subscript: liveEditor.isActive("subscript"),
        superscript: liveEditor.isActive("superscript"),
        bulletList: liveEditor.isActive("bulletList"),
        orderedList: liveEditor.isActive("orderedList"),
        taskList: liveEditor.isActive("taskList"),
        codeBlock: liveEditor.isActive("codeBlock"),
        blockquote: liveEditor.isActive("blockquote"),
        link: liveEditor.isActive("link"),
        alignLeft: liveEditor.isActive({ textAlign: "left" }),
        alignCenter: liveEditor.isActive({ textAlign: "center" }),
        alignRight: liveEditor.isActive({ textAlign: "right" }),
        alignJustify: liveEditor.isActive({ textAlign: "justify" }),
        headingLevel: ([1, 2, 3, 4, 5, 6] as const).find((level) =>
          liveEditor.isActive("heading", { level })
        ) ?? null,
        lineHeight: textStyle.lineHeight,
        fontFamily: textStyle.fontFamily,
        fontSize: textStyle.fontSize,
        textColor: textStyle.color ?? "#111111",
        highlightColor: (editor.getAttributes("highlight").color as string | undefined) ?? null,
        linkHref: liveEditor.getAttributes("link").href as string | undefined,
        selectionEmpty: liveEditor.state.selection.empty,
        indented:
          Number(
            (liveEditor.getAttributes("paragraph").indent as unknown) ??
              (liveEditor.getAttributes("heading").indent as unknown) ??
              0
          ) > 0,
        // WHY: Context drivers for the right-zone swap — computed in the same
        // snapshot so core and context never disagree about the selection.
        imageSelected: selectionNodeName(liveEditor) === "image" || liveEditor.isActive("image"),
        inTable: isSelectionInTable(liveEditor.state.selection),
        imageWidth: (liveEditor.getAttributes("image").width as number | null | undefined) ?? null,
        canAddRowBefore: liveEditor.can().addRowBefore(),
        canAddRowAfter: liveEditor.can().addRowAfter(),
        canDeleteRow: liveEditor.can().deleteRow(),
        canAddColumnBefore: liveEditor.can().addColumnBefore(),
        canAddColumnAfter: liveEditor.can().addColumnAfter(),
        canDeleteColumn: liveEditor.can().deleteColumn(),
        canMergeCells: liveEditor.can().mergeCells(),
        canSplitCell: liveEditor.can().splitCell(),
        canToggleHeaderRow: liveEditor.can().toggleHeaderRow(),
        canToggleHeaderColumn: liveEditor.can().toggleHeaderColumn(),
        canDeleteTable: liveEditor.can().deleteTable(),
        headerRowOn: isHeaderRowActive(liveEditor.state.selection),
        headerColumnOn: isHeaderColumnActive(liveEditor.state.selection),
        // WHY: Same sources as TableContextMenu's menuState — bar and menu
        // can never disagree about fill, borders, or alignment.
        cellFill: cellBackground(liveEditor),
        bordersOn: (liveEditor.getAttributes("table") as { borderless?: unknown }).borderless !== true,
        tableAlignment:
          normalizeTableAlignment(
            (liveEditor.getAttributes("table") as { tableAlignment?: unknown }).tableAlignment
          ) ?? "left",
      };
    },
  });
  const currentFontFamily = toolbarState.fontFamily;
  const currentFontSize = toolbarState.fontSize;
  const previousLink = toolbarState.linkHref;
  // WHY: The right zone earns its panel from the selection alone — the More
  // button never triggers a swap (user decision). Priority lives in
  // resolveToolbarContext so the rule is unit-tested, not eyeballed.
  const context = resolveToolbarContext({
    imageSelected: toolbarState.imageSelected,
    inTable: toolbarState.inTable,
    linkActive: toolbarState.link,
  });

  // WHY: Core row is always visible (every-paragraph tools, stable muscle
  // memory); the right cluster swaps its panel by selection with a slide
  // animation (see .fly-context-swap). Page setup + Zoom stay in the
  // default panel for this pass — they move to the title row on approval.
  return (
    <div className="fly-ribbon flex items-stretch gap-0 bg-background">
      {/* 60% Core — every-paragraph formatting, always visible. */}
      <div role="group" aria-label="Core tools, 60 percent" className="fly-ribbon-core flex min-w-0 flex-wrap items-center gap-0">
        <div className="flex items-center gap-0">
          <ToolbarButton title="Undo" active={false} onClick={() => editor.chain().focus().undo().run()}>
            <Undo />
          </ToolbarButton>
          <ToolbarButton title="Redo" active={false} onClick={() => editor.chain().focus().redo().run()}>
            <Redo />
          </ToolbarButton>
        </div>

        <ToolbarSeparator />

        <div className="flex flex-wrap items-center gap-0.5 [&>*]:shrink-0">
          <div className="fly-tight-menu w-28">
            <Dropdown
              id="paragraph-style"
              titleText="Paragraph style"
              hideLabel
              type="inline"
              label="Style"
              size="sm"
              items={PARAGRAPH_STYLES}
              selectedItem={
                toolbarState.headingLevel ? `Heading ${toolbarState.headingLevel}` : "Normal text"
              }
              // WHY: Compact trigger saves ~40px — menu keeps full
              // "Normal text / Heading N", bar shows "Normal / H1..H6".
              renderSelectedItem={(item) => (
                <span>{item === "Normal text" ? "Normal" : item.replace("Heading ", "H")}</span>
              )}
              onChange={(data) => {
                const style = data.selectedItem;
                if (style === "Normal text" || !style) editor.chain().focus().setParagraph().run();
                else {
                  const level = Number(style.replace("Heading ", "")) as 1 | 2 | 3 | 4 | 5 | 6;
                  editor.chain().focus().toggleHeading({ level }).run();
                }
              }}
            />
          </div>
          {/* Compact trigger (short family name); roomy menu fits full names. */}
          <div className="fly-roomy-menu-lg w-24">
            <Dropdown
              id="font-family"
              titleText="Font family"
              hideLabel
              type="inline"
              label="Font"
              size="sm"
              items={[FONT_UNSET_LABEL, ...WORD_FONT_FAMILIES]}
              selectedItem={currentFontFamily ?? FONT_UNSET_LABEL}
              renderSelectedItem={(item) => <span>{shortTriggerLabel(item)}</span>}
              onChange={(data) => {
                const font = data.selectedItem;
                if (!font || font === FONT_UNSET_LABEL) editor.chain().focus().unsetFontFamily().run();
                else editor.chain().focus().setFontFamily(font).run();
              }}
            />
          </div>
          <div className="fly-roomy-menu-md w-20">
            <Dropdown
              id="font-size"
              titleText="Font size"
              hideLabel
              type="inline"
              label="Size"
              size="sm"
              items={[SIZE_UNSET_LABEL, ...WORD_FONT_SIZES.map((size) => size.replace("px", ""))]}
              selectedItem={currentFontSize ? currentFontSize.replace("px", "") : SIZE_UNSET_LABEL}
              renderSelectedItem={(item) => <span>{shortTriggerLabel(item)}</span>}
              onChange={(data) => {
                const size = data.selectedItem;
                if (!size || size === SIZE_UNSET_LABEL) editor.chain().focus().unsetFontSize().run();
                else editor.chain().focus().setFontSize(`${size}px`).run();
              }}
            />
          </div>
          <ToolbarButton title="Bold (Ctrl+B)" active={toolbarState.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
            <TextBold />
          </ToolbarButton>
          <ToolbarButton title="Italic (Ctrl+I)" active={toolbarState.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <TextItalic />
          </ToolbarButton>
          <ToolbarButton title="Underline (Ctrl+U)" active={toolbarState.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <TextUnderline />
          </ToolbarButton>
          <ColorPicker
            title="Text color"
            value={toolbarState.textColor}
            // WHY: No .focus() — stealing focus would dismiss the popover.
            // Commands apply to the stored selection while unfocused.
            onSelect={(hex) => editor.chain().setColor(hex).run()}
          >
            <IconButton kind="ghost" size="sm" label="Text color" align="bottom">
              {/* WHY: Word-style current-color bar under the icon (not a tinted
                  icon) so the chosen color reads at a glance. The A itself is
                  pinned to foreground — ghost buttons tint text link-blue. */}
              <span className="flex flex-col items-center leading-none">
                <span className="text-sm font-bold text-foreground">A</span>
                <span
                  aria-hidden="true"
                  className="fly-color-bar h-1 w-4 rounded-sm"
                  style={{ backgroundColor: toolbarState.textColor }}
                />
              </span>
            </IconButton>
          </ColorPicker>
          <ColorPicker
            title="Highlight color"
            value={toolbarState.highlightColor}
            onSelect={(hex) => editor.chain().toggleHighlight({ color: hex }).run()}
          >
            <IconButton kind="ghost" size="sm" label="Highlight color" align="bottom">
              <span className="flex flex-col items-center leading-none">
                <TextHighlight className="h-4 w-4" />
                <span
                  aria-hidden="true"
                  className="fly-color-bar h-1 w-4 rounded-sm"
                  style={{ backgroundColor: toolbarState.highlightColor ?? "transparent" }}
                />
              </span>
            </IconButton>
          </ColorPicker>
          {/* WHY: Clear formatting lives next to styling so reset is one click. */}
          <ToolbarButton title="Clear formatting" active={false} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
            <TextClearFormat />
          </ToolbarButton>
        </div>

        <ToolbarSeparator />

        <div className="flex items-center gap-0 [&>*]:shrink-0">
          <ToolbarButton title="Align left" active={toolbarState.alignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <TextAlignLeft />
          </ToolbarButton>
          <ToolbarButton title="Align center" active={toolbarState.alignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <TextAlignCenter />
          </ToolbarButton>
          <ToolbarButton title="Align right" active={toolbarState.alignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <TextAlignRight />
          </ToolbarButton>
          <ToolbarButton title="Justify" active={toolbarState.alignJustify} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
            <TextAlignJustify />
          </ToolbarButton>
          <ToolbarButton title="Bullet list" active={toolbarState.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <ListBulleted />
          </ToolbarButton>
          <ToolbarButton title="Numbered list" active={toolbarState.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListNumbered />
          </ToolbarButton>
          <LinkButton
            editor={editor}
            linkActive={toolbarState.link}
            selectionEmpty={toolbarState.selectionEmpty}
            previousLinkHref={previousLink}
          />
        </div>
      </div>

      {/* Right cluster pinned right — its left divider lives in CSS
          (.fly-ribbon-secondary) so it hugs the cluster; the margin-left
          auto gap sits left of the divider. Content swaps by selection. */}
      <div
        role="group"
        aria-label={CONTEXT_LABELS[context]}
        aria-live="polite"
        className="fly-ribbon-secondary flex min-w-0 flex-wrap items-center gap-0"
      >
        {/* WHY: key remounts on context change so the slide animation
            replays per swap (see .fly-context-swap). The More button never
            triggers a swap — selection alone decides. */}
        <div key={context} className="fly-context-swap flex min-w-0 flex-wrap items-center gap-0">
          {context === "image" ? (
            <ImageContextTools editor={editor} imageWidth={toolbarState.imageWidth} />
          ) : context === "table" ? (
            <TableContextTools editor={editor} snapshot={toolbarState} />
          ) : context === "link" ? (
            <LinkContextTools editor={editor} snapshot={toolbarState} />
          ) : (
            <DefaultSecondaryTools
              editor={editor}
              snapshot={toolbarState}
              pageSetup={pageSetup}
              onPageSetupChange={onPageSetupChange}
              pageSetupOpen={pageSetupOpen}
              onPageSetupOpenChange={setPageSetupOpen}
              zoomPercent={zoomPercent}
              onZoomChange={onZoomChange}
              onSearchOpen={onSearchOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ title, active, onClick, children }: {
  title: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // WHY: Carbon IconButton carries its own tooltip (label) + selected state —
  // no wrapper needed. Tooltip appears below like the old custom one.
  return (
    <IconButton kind="ghost" size="sm" label={title} align="bottom" isSelected={active} onClick={onClick}>
      {children}
    </IconButton>
  );
}

// WHY: Cell fill reads tableCell first, tableHeader second — a header-cell
// caret reports through its own node type, and both share the attribute.
function cellBackground(liveEditor: Editor): string | null {
  try {
    const cell = liveEditor.getAttributes("tableCell") as { backgroundColor?: unknown };
    const header = liveEditor.getAttributes("tableHeader") as { backgroundColor?: unknown };
    const raw = cell.backgroundColor ?? header.backgroundColor;
    return typeof raw === "string" ? raw : null;
  } catch {
    return null;
  }
}

// WHY: Screen-reader labels for the swapping right cluster — announced via
// the zone's aria-live so the context change is perceivable, not just visual.
const CONTEXT_LABELS = {
  default: "Secondary tools",
  image: "Image tools",
  table: "Table tools",
  link: "Link tools",
} as const;

// WHY: NodeSelection (image click) carries the node; a text caret does not.
// Duck-typed so a destroyed-view proxy can never throw out of the snapshot.
function selectionNodeName(liveEditor: Editor): string | null {
  try {
    const selection = liveEditor.state.selection as unknown as {
      node?: { type?: { name?: string } };
    };
    return selection.node?.type?.name ?? null;
  } catch {
    return null;
  }
}
