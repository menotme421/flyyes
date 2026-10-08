import { useEditorState, type Editor } from "@tiptap/react";
import { useState } from "react";
import {
  Checkmark,
  Code,
  DocumentConfiguration,
  Link,
  ListBulleted,
  ListChecked,
  ListNumbered,
  OverflowMenuVertical,
  PageBreak,
  Quotes,
  Redo,
  Search,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  TextBold,
  TextClearFormat,
  TextHighlight,
  TextIndentLess,
  TextIndentMore,
  TextItalic,
  TextStrikethrough,
  TextSubscript,
  TextSuperscript,
  TextUnderline,
  Undo,
} from "@carbon/icons-react";
import { Dropdown, IconButton, Popover, PopoverContent } from "@carbon/react";
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, WORD_FONT_FAMILIES, WORD_FONT_SIZES } from "@/editor/editorExtensions";
import { ColorPicker } from "@/components/ColorPicker";
import { LayoutListMove } from "@/components/icons/layout-list-move";
import { PageSetupDialog } from "@/components/PageSetupDialog";
import { UrlDialog } from "@/components/UrlDialog";
import { ZoomSelect } from "@/components/ZoomSelect";
import type { ResolvedPageSetup } from "@/services/pageSetupService";
import type { PageOrientation } from "@/storage/documentTypes";
import { ImageMenu, TableInsert } from "./InsertMenu";

// WHY: Ribbon order — File, history, Insert + Link, Styles, Font essentials,
// Paragraph essentials, Search, More overflow, Zoom right. Rarely-used tools
// live in the More panel (Carbon text-toolbar overflow pattern) so the bar
// never scrolls — scrolling would trap Carbon's floating menus inside it.
// Sizing utilities stay on plain wrapper divs, never on Carbon roots
// (Carbon's unlayered CSS beats Tailwind utilities on the same element).

const LINE_SPACINGS = ["1.0", "1.15", "1.5", "2.0"] as const;
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
      };
    },
  });
  const currentFontFamily = toolbarState.fontFamily;
  const currentFontSize = toolbarState.fontSize;
  const previousLink = toolbarState.linkHref;

  // WHY: One middle gap (no swapping yet) — Core holds every-paragraph
  // tools so muscle memory never shifts; Secondary holds
  // document/search/insert/advanced tools that will later swap by selection
  // (image / table / link). Core sits left, Secondary pins right (see
  // flyyes.scss) — the single gap absorbs leftover width. Page setup +
  // Zoom still live in Secondary for this visual pass — they move to the
  // title row on approval.
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

      {/* Secondary cluster pinned right — its left divider lives in CSS
          (.fly-ribbon-secondary) so it hugs the cluster; the margin-left
          auto gap sits left of the divider. Later swaps by selection. */}
      <div role="group" aria-label="Secondary tools, 40 percent" className="fly-ribbon-secondary flex min-w-0 flex-wrap items-center gap-0">
        <div className="flex items-center gap-0">
          <ToolbarButton title="Find and replace (Ctrl+F)" active={false} onClick={onSearchOpen}>
            <Search />
          </ToolbarButton>
          <ToolbarButton title="Page setup (paper presets)" active={false} onClick={() => setPageSetupOpen(true)}>
            <DocumentConfiguration />
          </ToolbarButton>
          <PageSetupDialog
            open={pageSetupOpen}
            onClose={() => setPageSetupOpen(false)}
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
          <ToolbarButton title="Page break" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <PageBreak />
          </ToolbarButton>
        </div>

        <ToolbarSeparator />

        <div className="flex flex-wrap items-center gap-0 [&>*]:shrink-0">
          <ToolbarButton title="Strikethrough" active={toolbarState.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <TextStrikethrough />
          </ToolbarButton>
          <div className="fly-roomy-menu-md w-28">
            <Dropdown
              id="line-spacing"
              titleText="Line spacing"
              hideLabel
              type="inline"
              label="Spacing"
              size="sm"
              items={["1.7 (Default)", ...LINE_SPACINGS]}
              selectedItem={toolbarState.lineHeight ?? "1.7 (Default)"}
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
          <ToolbarButton title="Decrease indent" active={false} onClick={() => editor.commands.decreaseIndent()}>
            <TextIndentLess />
          </ToolbarButton>
          <ToolbarButton title="Increase indent" active={toolbarState.indented} onClick={() => editor.commands.increaseIndent()}>
            <TextIndentMore />
          </ToolbarButton>
          <ToolbarButton title="Task list" active={toolbarState.taskList} onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <ListChecked />
          </ToolbarButton>
        </div>
        {/* WHY: Whole 40% cluster packs right (not just More) so the
            zone finishes at the bar edge with no internal split — search
            through More stay together as one group. */}
        <div className="flex shrink-0 items-center">
          <FormatOverflow editor={editor} toolbarState={toolbarState} />
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

// WHY: Link promoted out of Insert into its own toolbar button (most-used
// insert by far). Same dialog + validation as before, just one click away.
function LinkButton({ editor, linkActive, selectionEmpty, previousLinkHref }: {
  editor: Editor;
  linkActive: boolean;
  selectionEmpty: boolean;
  previousLinkHref?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <>
      <ToolbarButton title="Link…" active={linkActive} onClick={() => setDialogOpen(true)}>
        <Link />
      </ToolbarButton>
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

// WHY: Overflow holds only the specialists — character modifiers
// (sub/superscript) and block containers (quote, code). Everything else
// earned a ribbon slot, so this panel stays short.
function FormatOverflow({ editor, toolbarState }: {
  editor: Editor;
  toolbarState: {
    subscript: boolean;
    superscript: boolean;
    blockquote: boolean;
    codeBlock: boolean;
  };
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
          checked={toolbarState.subscript}
          onClick={closeAnd(() => editor.chain().focus().toggleSubscript().run())}
        />
        <OverflowRow
          icon={<TextSuperscript />}
          label="Superscript"
          checked={toolbarState.superscript}
          onClick={closeAnd(() => editor.chain().focus().toggleSuperscript().run())}
        />
        <OverflowRow
          icon={<Quotes />}
          label="Quote"
          checked={toolbarState.blockquote}
          onClick={closeAnd(() => editor.chain().focus().toggleBlockquote().run())}
        />
        <OverflowRow
          icon={<Code />}
          label="Code block"
          checked={toolbarState.codeBlock}
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

function ToolbarSeparator() {
  return <div aria-hidden="true" className="fly-separator" />;
}
