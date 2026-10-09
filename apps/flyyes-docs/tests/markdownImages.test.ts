import { describe, expect, it } from "vitest";
import { convertJsonToMarkdown, replaceInlineImageData } from "@/services/markdownService";

// WHY: Exported Markdown is shared with people and AI tools — a megabyte of
// base64 in the middle makes it unreadable and breaks renderers.
describe("replaceInlineImageData", () => {
  it("collapses base64 images to placeholders", () => {
    expect(replaceInlineImageData("Hello\n\n![photo](data:image/jpeg;base64,/9j/abc123)\n")).toBe(
      "Hello\n\n[image: photo]\n"
    );
  });

  it("handles empty alt text", () => {
    expect(replaceInlineImageData("![](data:image/png;base64,AAA)")).toBe("[image]");
  });

  it("keeps remote URLs untouched", () => {
    const markdown = "![logo](https://example.com/logo.png)";
    expect(replaceInlineImageData(markdown)).toBe(markdown);
  });
});

describe("convertJsonToMarkdown with images", () => {
  it("keeps remote image references intact", () => {
    const contentJson = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
        { type: "image", attrs: { src: "https://example.com/a.png", alt: "A" } },
      ],
    });
    const markdown = convertJsonToMarkdown(contentJson);
    expect(markdown).toContain("https://example.com/a.png");
  });

  it("replaces embedded uploads with placeholders", () => {
    const contentJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "data:image/jpeg;base64,/9j/AAA", alt: "B" },
        },
      ],
    });
    const markdown = convertJsonToMarkdown(contentJson);
    expect(markdown).toContain("[image: B]");
    expect(markdown).not.toContain("data:image");
  });
});
