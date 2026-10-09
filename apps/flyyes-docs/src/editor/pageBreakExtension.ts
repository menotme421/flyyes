import HorizontalRule from "@tiptap/extension-horizontal-rule";

export const PAGE_BREAK_MARKER_CLASS = "page-break-marker";

// WHY: HorizontalRule is this app's manual page-break marker — it opens a
// fresh page in edit gaps, preview sheets, print, and DOCX. A bare <hr> reads
// as a meaningless dashed line (users asked "why is there still a dashed line
// on the new page?"), so the edit surface renders an explicit labeled marker
// instead: dashed rule + "Page break" pill + remove button.
// Serialization is untouched (still <hr> / ---), so preview, print, DOCX,
// Markdown, and HTML export all keep working on the same node.

export const PageBreakMarker = HorizontalRule.extend({
  addNodeView() {
    return ({ editor, getPos, node }) => {
      const marker = document.createElement("div");
      marker.className = `${PAGE_BREAK_MARKER_CLASS} no-print`;
      marker.setAttribute("contenteditable", "false");

      const leftLine = document.createElement("span");
      leftLine.className = "page-break-line";
      leftLine.setAttribute("aria-hidden", "true");

      const tag = document.createElement("span");
      tag.className = "page-break-tag";
      tag.textContent = "Page break";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "page-break-remove";
      remove.setAttribute("aria-label", "Remove page break");
      remove.textContent = "×";
      // WHY: mousedown would steal the editor selection before click fires —
      // prevent it so removal is a single quiet delete with no focus jump.
      remove.addEventListener("mousedown", (event) => event.preventDefault());
      remove.addEventListener("click", () => {
        const pos = getPos();
        if (typeof pos !== "number") return;
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .run();
      });
      tag.append(remove);

      const rightLine = document.createElement("span");
      rightLine.className = "page-break-line";
      rightLine.setAttribute("aria-hidden", "true");

      marker.append(leftLine, tag, rightLine);
      return { dom: marker };
    };
  },
});
