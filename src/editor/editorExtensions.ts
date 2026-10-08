import CharacterCount from "@tiptap/extension-character-count";
import { FindAndReplace } from "@tiptap/extension-find-and-replace";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style/text-style-kit";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { FlyyesIndent } from "./indentExtension";
import { PageBreakIndicators } from "./pageBreakIndicators";
import { PageBreakMarker } from "./pageBreakExtension";
import { ResizableImage } from "./resizableImageExtension";
import { TableProperties } from "./tablePropertiesExtension";

// WHY: One shared extension list so editor, markdown export, and page preview
// never drift. All free/open-source (MIT) — no Pro needed for V2 free merge.
// TextStyleKit bundles font-family + font-size + color + background + line-height.

export const WORD_FONT_FAMILIES = [
  "Arial",
  "Calibri",
  "Cambria",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Courier New",
] as const;

export const WORD_FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"] as const;

// WHY: Word-style toolbar — the boxes always show a concrete value, never a
// blank label. These match the CSS defaults (Inter first in the font stack,
// 16px body text), so what you see is what renders when nothing is set.
export const DEFAULT_FONT_FAMILY = "Inter";
export const DEFAULT_FONT_SIZE = "16px";
// WHY: Unset paragraphs render at the CSS default below — the toolbar shows
// this number instead of a blank label (same Word-style rule as font/size).
export const DEFAULT_LINE_SPACING = "1.7";

export function createWordExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      // StarterKit's rule stays off: PageBreakMarker below owns the node and
      // renders it as a labeled manual page-break badge in the edit surface.
      horizontalRule: false,
      // WHY: StarterKit v3 bundles Link + Underline — the explicit ones below
      // carry custom config (XSS-safe URLs), so the kit copies stay off to
      // avoid duplicate-registration warnings.
      link: false,
      underline: false,
    }),
    PageBreakMarker,
    TextStyleKit,
    Underline,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Subscript,
    Superscript,
    Typography,
    Link.configure({
      openOnClick: false,
      autolink: true,
      // WHY: Block javascript: URLs (XSS) — toolbar prompt also validates.
      isAllowedUri: (url) => /^(https?:\/\/|mailto:)/i.test(url),
    }),
    ResizableImage.configure({ inline: false, allowBase64: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    // WHY: Headless search — UI lives in SearchPanel so it can dock anywhere.
    // injectCSS stays on (default highlight classes); print CSS hides them.
    FindAndReplace.configure({ injectCSS: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder: "Start writing… (autosaves in this browser)" }),
    CharacterCount,
    FlyyesIndent,
    TableProperties,
    PageBreakIndicators,
    Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
  ];
}
