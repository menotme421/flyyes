import { describe, expect, it } from "vitest";
import { normalizeEmptyBlocks } from "@/services/pagePreviewService";

// WHY: Empty blocks serialize bare (<p></p>) but edit with a <br> — preview
// must restore it or table rows (and blank lines) render shorter than edit.

describe("normalizeEmptyBlocks", () => {
  it("adds a br to empty paragraphs", () => {
    expect(normalizeEmptyBlocks("<td><p></p></td>")).toBe("<td><p><br></p></td>");
  });

  it("treats whitespace-only blocks as empty", () => {
    expect(normalizeEmptyBlocks("<p>   </p>")).toBe("<p><br></p>");
    expect(normalizeEmptyBlocks("<p>&nbsp;</p>")).toBe("<p><br></p>");
  });

  it("covers empty headings too", () => {
    expect(normalizeEmptyBlocks("<h2></h2>")).toBe("<h2><br></h2>");
  });

  it("leaves blocks that already have a br alone", () => {
    expect(normalizeEmptyBlocks("<p><br></p>")).toBe("<p><br></p>");
    expect(normalizeEmptyBlocks("<p><br/></p>")).toBe("<p><br/></p>");
  });

  it("leaves non-empty blocks alone", () => {
    expect(normalizeEmptyBlocks("<p>hi</p>")).toBe("<p>hi</p>");
    expect(normalizeEmptyBlocks("<p>hi<br>there</p>")).toBe("<p>hi<br>there</p>");
    expect(normalizeEmptyBlocks("<table><tr><td>x</td></tr></table>")).toBe(
      "<table><tr><td>x</td></tr></table>"
    );
  });
});
