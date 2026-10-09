import { MarkdownManager } from "@tiptap/markdown";
import { createWordExtensions } from "@/editor/editorExtensions";
import { logError } from "@/utils/appLogger";

// WHY: Markdown is the bridge to devs/AI tools. Manager (not mounted editor)
// converts stored JSON <-> markdown so export works even without opening the doc.
// GFM tables/task lists enabled via StarterKit + Table extensions in shared config.

let cachedManager: MarkdownManager | null = null;

function getManager(): MarkdownManager {
  if (!cachedManager) {
    cachedManager = new MarkdownManager({ extensions: createWordExtensions() });
  }
  return cachedManager;
}

export function convertJsonToMarkdown(contentJson: string): string {
  try {
    const parsed = JSON.parse(contentJson) as object;
    return replaceInlineImageData(getManager().serialize(parsed as never));
  } catch (error) {
    logError("Markdown export failed", {});
    throw new Error("Could not convert document to Markdown.");
  }
}

// WHY: Serialized images come out as ![alt](data:image/…base64…) — megabytes
// of unreadable text that breaks many renderers. Remote URLs pass through
// untouched; embedded uploads collapse to a readable placeholder instead.
export function replaceInlineImageData(markdown: string): string {
  return markdown.replace(
    /!\[([^\]\n]*)\]\(data:image\/[^)\s]+\s*("[^"\n]*")?\)/g,
    (_match, alt: string, _title: string | undefined) =>
      alt.trim() ? `[image: ${alt.trim()}]` : "[image]"
  );
}

export function convertMarkdownToJson(markdownText: string): string {
  if (markdownText.length > 1_000_000) {
    throw new Error("Markdown file is too large (over 1MB).");
  }
  try {
    const json = getManager().parse(markdownText);
    const text = JSON.stringify(json);
    if (text.length > 5_000_000) throw new Error("Document is too large after conversion.");
    return text;
  } catch (error) {
    logError("Markdown import failed", {});
    if (error instanceof Error) throw error;
    throw new Error("Could not read that Markdown file.");
  }
}

export function downloadMarkdownFile(title: string, markdown: string): void {
  const safeName = (title.trim() || "document").replace(/[\\/:*?"<>|]/g, "-");
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}.md`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
