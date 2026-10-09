import { describe, expect, it } from "vitest";
import { convertJsonToMarkdown, convertMarkdownToJson } from "@/services/markdownService";

// WHY: Phase 1 features ride on the shared extension list — if TaskList or
// H4-H6 ever drop out of createWordExtensions, Markdown round-trip breaks and
// these tests catch it without needing a browser DOM.

function docWith(...nodes: unknown[]): string {
  return JSON.stringify({ type: "doc", content: nodes });
}

describe("heading levels 4-6", () => {
  it("serializes h4-h6 to Markdown", () => {
    const json = docWith(
      { type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "Deep dive" }] },
      { type: "heading", attrs: { level: 6 }, content: [{ type: "text", text: "Fine print" }] }
    );
    const markdown = convertJsonToMarkdown(json);
    expect(markdown).toContain("#### Deep dive");
    expect(markdown).toContain("###### Fine print");
  });

  it("parses h4-h6 Markdown back to headings", () => {
    const json = convertMarkdownToJson("#### Deep dive\n\n###### Fine print\n");
    const parsed = JSON.parse(json) as { content?: { type?: string; attrs?: { level?: number } }[] };
    const levels = (parsed.content ?? []).filter((n) => n.type === "heading").map((n) => n.attrs?.level);
    expect(levels).toContain(4);
    expect(levels).toContain(6);
  });
});

describe("task lists", () => {
  it("serializes checked and unchecked items", () => {
    const json = docWith({
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Buy milk" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Done thing" }] }],
        },
      ],
    });
    const markdown = convertJsonToMarkdown(json);
    expect(markdown).toContain("Buy milk");
    expect(markdown).toContain("Done thing");
    // GFM checkbox markers (unchecked / checked).
    expect(markdown).toMatch(/-\s*\[\s\]/);
    expect(markdown).toMatch(/-\s*\[[xX]\]/);
  });

  it("parses GFM checkboxes back to task items", () => {
    const json = convertMarkdownToJson("- [ ] Buy milk\n- [x] Done thing\n");
    expect(json).toContain("taskList");
    expect(json).toContain("taskItem");
    expect(json).toContain("Buy milk");
  });

  it("handles empty task item text without crashing", () => {
    const json = docWith({
      type: "taskList",
      content: [{ type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] }],
    });
    expect(() => convertJsonToMarkdown(json)).not.toThrow();
  });
});

describe("code blocks", () => {
  it("round-trips fenced code through Markdown", () => {
    const json = docWith({
      type: "codeBlock",
      attrs: { language: null },
      content: [{ type: "text", text: "const a = 1;" }],
    });
    const markdown = convertJsonToMarkdown(json);
    expect(markdown).toContain("const a = 1;");
    const back = convertMarkdownToJson(markdown);
    expect(back).toContain("const a = 1;");
  });
});
