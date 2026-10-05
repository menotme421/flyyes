import { useRef } from "react";
import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

// WHY: Word-style drag-to-resize for images as a tiny owned extension.
// Width persists in the node attrs (percent of page width) so it survives
// reload, HTML/Markdown export, and DOCX export. No new dependency —
// TipTap's own ReactNodeViewRenderer + a corner handle.

// Bounds for the drag (percent of editor width). Small enough to stay usable,
// large enough to never vanish or overflow the page.
export const MIN_IMAGE_WIDTH_PCT = 10;
export const MAX_IMAGE_WIDTH_PCT = 100;
export const DEFAULT_IMAGE_WIDTH_PCT = 100;

export function clampImageWidthPct(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_IMAGE_WIDTH_PCT;
  return Math.min(MAX_IMAGE_WIDTH_PCT, Math.max(MIN_IMAGE_WIDTH_PCT, Math.round(parsed)));
}

// WHY: Accepts "50%", "50", or 50 (pasted HTML varies). Anything else → null
// (full width) rather than a corrupt value in stored JSON.
export function parseImageWidth(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? clampImageWidthPct(value) : null;
  }
  if (typeof value !== "string") return null;
  const match = /^\s*(\d+(?:\.\d+)?)\s*%?\s*$/.exec(value);
  if (!match) return null;
  return clampImageWidthPct(Number(match[1]));
}

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const widthPct = clampImageWidthPct(
    typeof node.attrs.width === "number" ? node.attrs.width : parseImageWidth(node.attrs.width)
  );
  const dragState = useRef<{ startX: number; startWidthPct: number; baseWidthPx: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLSpanElement>) => {
    // WHY: Stop the browser's native image drag so the gesture resizes only.
    event.preventDefault();
    event.stopPropagation();
    const wrapper = event.currentTarget.parentElement as HTMLElement | null;
    const editorElement = wrapper?.closest(".tiptap") as HTMLElement | null;
    const baseWidthPx = editorElement?.clientWidth || wrapper?.clientWidth || 1;
    dragState.current = { startX: event.clientX, startWidthPct: widthPct, baseWidthPx };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const state = dragState.current;
      if (!state) return;
      const deltaPct = ((moveEvent.clientX - state.startX) / state.baseWidthPx) * 100;
      updateAttributes({ width: clampImageWidthPct(Math.round(state.startWidthPct + deltaPct)) });
    };
    const handlePointerUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // WHY: Arrow keys on the handle mirror the drag for keyboard users.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      updateAttributes({ width: clampImageWidthPct(widthPct + 5) });
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      updateAttributes({ width: clampImageWidthPct(widthPct - 5) });
    }
  };

  return (
    <NodeViewWrapper as="div" className="resizable-image" style={{ width: `${widthPct}%` }}>
      <img
        src={node.attrs.src as string}
        alt={(node.attrs.alt as string | null) ?? ""}
        title={(node.attrs.title as string | null) ?? undefined}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      {selected ? (
        <span
          role="slider"
          tabIndex={0}
          aria-label="Resize image"
          aria-valuenow={widthPct}
          aria-valuemin={MIN_IMAGE_WIDTH_PCT}
          aria-valuemax={MAX_IMAGE_WIDTH_PCT}
          className="no-print image-resize-handle"
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
        />
      ) : null}
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  // WHY: Same node name ("image") so existing documents load unchanged —
  // old images simply resolve to full width.
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          parseImageWidth(element.getAttribute("data-image-width") || element.style.width),
        renderHTML: (attributes) => {
          const width = parseImageWidth(attributes.width);
          if (width === null) return {};
          return { "data-image-width": String(width), style: `width: ${width}%` };
        },
      },
      // WHY: True pixel size for aspect-correct DOCX export. Never rendered to
      // HTML (no visual effect) and never parsed (can't trust pasted values).
      naturalWidth: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      naturalHeight: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
