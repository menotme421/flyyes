import { useEditorState, type Editor } from "@tiptap/react";
import { useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  Indent,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Outdent,
  Quote,
  Redo,
  RemoveFormatting,
  Search,
  Strikethrough,
  Subscript,
  Superscript,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_LINE_SPACING, WORD_FONT_FAMILIES, WORD_FONT_SIZES } from "@/editor/editorExtensions";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ColorPicker";
import { Columns3Cog } from "@/components/icons/columns-3-cog";
import { LayoutListMove } from "@/components/icons/layout-list-move";
import { ExportMenu } from "@/components/ExportMenu";
import { PageSetupDialog } from "@/components/PageSetupDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ZoomSelect } from "@/components/ZoomSelect";
import type { ResolvedPageSetup } from "@/services/pageSetupService";
import type { PageOrientation } from "@/storage/documentTypes";
import { InsertMenu } from "./InsertMenu";

// WHY: Ribbon order follows Word + Google Docs — File first, undo/redo up
// front, Styles before Font, all character formatting in Font (incl. clear
// formatting, like Word), paragraph block tools together, Insert after
// Paragraph, view controls pinned right. Each category stacks its controls
// on top with a small Capitalized label centered underneath.

const UNSET_VALUE = "default";
const LINE_SPACINGS = ["1.0", "1.15", "1.5", "2.0"] as const;

interface EditorToolbarProperties {
  editor: Editor;
  exportTitle: string;
  exportJson: string;
  exportHtml: string;
  onExportError: (message: string) => void;
  pageSetup: ResolvedPageSetup;
  onPageSetupChange: (presetId: string, orientation: PageOrientation) => void;
  zoomPercent: number;
  onZoomChange: (nextZoom: number) => void;
  onSearchOpen: () => void;
}

export function EditorToolbar({
  editor,
  exportTitle,
  exportJson,
  exportHtml,
  onExportError,
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

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 overflow-x-auto bg-background px-2 py-1 [&>*]:shrink-0">
        <div className="flex items-center gap-0.5 [&>*]:shrink-0">
          {/* Single Export entry point (JSON / Markdown / Word / HTML / Print) */}
          <ExportMenu
            documentTitle={exportTitle}
            contentJson={exportJson}
            contentHtml={exportHtml}
            pageMargins={pageSetup.margins}
            paperSizeMm={{ widthMm: pageSetup.paperWidthMm, heightMm: pageSetup.paperHeightMm }}
            onError={onExportError}
          />
          {/* Page setup replaces ruler dragging for margins (ruler removed) */}
          <ToolbarButton title="Page setup (paper presets)" active={false} onClick={() => setPageSetupOpen(true)}>
            <Columns3Cog />
          </ToolbarButton>
          <PageSetupDialog
            open={pageSetupOpen}
            onClose={() => setPageSetupOpen(false)}
            initialPresetId={pageSetup.presetId}
            initialOrientation={pageSetup.landscape ? "landscape" : "portrait"}
            onSave={onPageSetupChange}
          />
        </div>

        <ToolbarSeparator />

        <div className="flex items-center gap-0.5 [&>*]:shrink-0">
          <ToolbarButton title="Undo" active={false} onClick={() => editor.chain().focus().undo().run()}>
            <Undo />
          </ToolbarButton>
          <ToolbarButton title="Redo" active={false} onClick={() => editor.chain().focus().redo().run()}>
            <Redo />
          </ToolbarButton>
        </div>

        <ToolbarSeparator />

        <div className="flex items-center gap-0.5 [&>*]:shrink-0">
          <Select
            value={toolbarState.headingLevel ? `heading${toolbarState.headingLevel}` : "paragraph"}
            onValueChange={(value) => {
              if (value === "paragraph") editor.chain().focus().setParagraph().run();
              else {
                const level = Number(value.replace("heading", "")) as 1 | 2 | 3 | 4 | 5 | 6;
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
          >
            <SelectTrigger aria-label="Paragraph style" className="h-8 w-28 text-xs [&_span]:truncate">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Normal text</SelectItem>
              <SelectSeparator />
              <SelectItem value="heading1">Heading 1</SelectItem>
              <SelectItem value="heading2">Heading 2</SelectItem>
              <SelectItem value="heading3">Heading 3</SelectItem>
              <SelectItem value="heading4">Heading 4</SelectItem>
              <SelectItem value="heading5">Heading 5</SelectItem>
              <SelectItem value="heading6">Heading 6</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ToolbarSeparator />

        <div className="flex items-center gap-0.5 [&>*]:shrink-0">
          <Select
            value={currentFontFamily ?? DEFAULT_FONT_FAMILY}
            onValueChange={(value) => {
              if (value === UNSET_VALUE) editor.chain().focus().unsetFontFamily().run();
              else editor.chain().focus().setFontFamily(value).run();
            }}
          >
            <SelectTrigger aria-label="Font family" className="h-8 w-36 text-xs [&_span]:truncate">
              <SelectValue placeholder={DEFAULT_FONT_FAMILY} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET_VALUE}>Font</SelectItem>
              <SelectSeparator />
              {WORD_FONT_FAMILIES.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={currentFontSize ?? DEFAULT_FONT_SIZE}
            onValueChange={(value) => {
              if (value === UNSET_VALUE) editor.chain().focus().unsetFontSize().run();
              else editor.chain().focus().setFontSize(value).run();
            }}
          >
            <SelectTrigger aria-label="Font size" className="h-8 w-16 text-xs">
              <SelectValue placeholder={DEFAULT_FONT_SIZE.replace("px", "")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET_VALUE}>Size</SelectItem>
              <SelectSeparator />
              {WORD_FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size.replace("px", "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToolbarButton title="Bold (Ctrl+B)" active={toolbarState.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold />
          </ToolbarButton>
          <ToolbarButton title="Italic (Ctrl+I)" active={toolbarState.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic />
          </ToolbarButton>
          <ToolbarButton title="Underline (Ctrl+U)" active={toolbarState.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon />
          </ToolbarButton>
          <ToolbarButton title="Strikethrough" active={toolbarState.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough />
          </ToolbarButton>
          <ToolbarButton title="Subscript" active={toolbarState.subscript} onClick={() => editor.chain().focus().toggleSubscript().run()}>
            <Subscript />
          </ToolbarButton>
          <ToolbarButton title="Superscript" active={toolbarState.superscript} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
            <Superscript />
          </ToolbarButton>
          <ColorPicker
            title="Text color"
            value={toolbarState.textColor}
            // WHY: No .focus() — stealing focus would dismiss the popover.
            // Commands apply to the stored selection while unfocused.
            onSelect={(hex) => editor.chain().setColor(hex).run()}
          >
            <Button variant="ghost" size="icon" aria-label="Text color" className="h-8 w-8">
              {/* WHY: Word-style current-color bar under the icon (not a tinted
                  icon) so the chosen color reads at a glance. */}
              <span className="flex flex-col items-center leading-none">
                <span className="text-sm font-bold">A</span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 h-1 w-4 rounded-sm border border-black/10"
                  style={{ backgroundColor: toolbarState.textColor }}
                />
              </span>
            </Button>
          </ColorPicker>
          <ColorPicker
            title="Highlight color"
            value={toolbarState.highlightColor}
            onSelect={(hex) => editor.chain().toggleHighlight({ color: hex }).run()}
          >
            <Button variant="ghost" size="icon" aria-label="Highlight color" className="h-8 w-8">
              <span className="flex flex-col items-center leading-none">
                <Highlighter className="h-4 w-4" />
                <span
                  aria-hidden="true"
                  className="mt-0.5 h-1 w-4 rounded-sm border border-black/10"
                  style={{ backgroundColor: toolbarState.highlightColor ?? "transparent" }}
                />
              </span>
            </Button>
          </ColorPicker>
          {/* WHY: Clear formatting lives in Font (Word puts it there), not Edit. */}
          <ToolbarButton title="Clear formatting" active={false} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
            <RemoveFormatting />
          </ToolbarButton>
        </div>

        <ToolbarSeparator />

        <div className="flex items-center gap-0.5 [&>*]:shrink-0">
          <ToolbarButton title="Align left" active={toolbarState.alignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft />
          </ToolbarButton>
          <ToolbarButton title="Align center" active={toolbarState.alignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter />
          </ToolbarButton>
          <ToolbarButton title="Align right" active={toolbarState.alignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight />
          </ToolbarButton>
          <ToolbarButton title="Justify" active={toolbarState.alignJustify} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
            <AlignJustify />
          </ToolbarButton>
          {/* WHY: Icon trigger shows icon + live value (no chevron, no blank
              label) — same Word-style rule as font/size. "Lines" clears back
              to the CSS default. */}
          <Select
            value={toolbarState.lineHeight ?? UNSET_VALUE}
            onValueChange={(value) => {
              if (value === UNSET_VALUE) editor.chain().focus().unsetLineHeight().run();
              else editor.chain().focus().setLineHeight(value).run();
            }}
          >
            <SelectTrigger aria-label={toolbarState.lineHeight ? `Line spacing: ${toolbarState.lineHeight}` : `Line spacing: ${DEFAULT_LINE_SPACING}`} title={toolbarState.lineHeight ? `Line spacing: ${toolbarState.lineHeight}` : `Line spacing: ${DEFAULT_LINE_SPACING}`} hideChevron className="h-8 w-auto gap-1.5 px-2 text-xs">
              <LayoutListMove className="h-4 w-4 shrink-0" />
              <span>{toolbarState.lineHeight ?? DEFAULT_LINE_SPACING}</span>
            </SelectTrigger>
            <SelectContent>
              {/* WHY: The unset entry IS the 1.7 default, honestly labeled —
                  so trigger text, checkmark, and options always agree. */}
              <SelectItem value={UNSET_VALUE}>1.7 (Default)</SelectItem>
              <SelectSeparator />
              {LINE_SPACINGS.map((spacing) => (
                <SelectItem key={spacing} value={spacing}>
                  {spacing}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToolbarButton title="Bullet list" active={toolbarState.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List />
          </ToolbarButton>
          <ToolbarButton title="Numbered list" active={toolbarState.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered />
          </ToolbarButton>
          {/* WHY: Task list + code block live next to the other lists (same
              Word-style grouping) — StarterKit already ships codeBlock, the
              TaskList extension above adds taskList. */}
          <ToolbarButton title="Task list" active={toolbarState.taskList} onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <ListChecks />
          </ToolbarButton>
          <ToolbarButton title="Code block" active={toolbarState.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <Code />
          </ToolbarButton>
          <ToolbarButton title="Find and replace (Ctrl+F)" active={false} onClick={onSearchOpen}>
            <Search />
          </ToolbarButton>
          {/* WHY: Owned indent extension (replaces ruler drag for paragraph indent). */}
          <ToolbarButton title="Decrease indent" active={false} onClick={() => editor.commands.decreaseIndent()}>
            <Outdent />
          </ToolbarButton>
          <ToolbarButton title="Increase indent" active={toolbarState.indented} onClick={() => editor.commands.increaseIndent()}>
            <Indent />
          </ToolbarButton>
          <ToolbarButton title="Quote" active={toolbarState.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote />
          </ToolbarButton>
        </div>

        <ToolbarSeparator />

        <div className="flex items-center gap-0.5 [&>*]:shrink-0">
          <InsertMenu
            editor={editor}
            linkActive={toolbarState.link}
            selectionEmpty={toolbarState.selectionEmpty}
            previousLinkHref={previousLink}
          />
        </div>

        {/* Zoom pushed right (view switch lives in the title row above). */}
        <div className="ml-auto flex items-center gap-1 [&>*]:shrink-0">
          <ZoomSelect zoomPercent={zoomPercent} onZoomChange={onZoomChange} />
        </div>
      </div>
    </TooltipProvider>
  );
}

function ToolbarButton({ title, active, onClick, children }: {
  title: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={title}
          className={`h-8 w-8 ${active ? "bg-muted" : ""}`} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{title}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarSeparator() {
  return <Separator orientation="vertical" className="mx-1 h-auto self-stretch" />;
}
