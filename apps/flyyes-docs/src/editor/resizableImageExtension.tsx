import { useRef } from "react";
import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

// WHY: Word-style drag-to-resize for images as a tiny owned extension.
// Width + optional height persist in the node attrs (percent of page width) so
// they survive reload, HTML/Markdown export, and DOCX export. No new
// dependency — TipTap's own ReactNodeViewRenderer + eight live handles
// (corners proportional, edges single-axis).

// Bounds for the drag (percent of editor width). Small enough to stay usable,
// large enough to never vanish or overflow the page.
export const MIN_IMAGE_WIDTH_PCT = 10;
export const MAX_IMAGE_WIDTH_PCT = 100;
export const DEFAULT_IMAGE_WIDTH_PCT = 100;

// WHY: Height shares width's unit (% of page width) so the pair stays portable
// across presets and zoom — no px dependence. Tall infographics are legit, so
// the ceiling is generous; garbage still collapses to safe bounds.
export const MIN_IMAGE_HEIGHT_PCT = 5;
export const MAX_IMAGE_HEIGHT_PCT = 300;

export function clampImageWidthPct(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_IMAGE_WIDTH_PCT;
  return Math.min(MAX_IMAGE_WIDTH_PCT, Math.max(MIN_IMAGE_WIDTH_PCT, Math.round(parsed)));
}

export function clampImageHeightPct(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_IMAGE_WIDTH_PCT;
  return Math.min(MAX_IMAGE_HEIGHT_PCT, Math.max(MIN_IMAGE_HEIGHT_PCT, Math.round(parsed)));
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

// WHY: Same tolerant parsing as width. Anything else → null (aspect-locked)
// rather than a corrupt value in stored JSON — legacy docs have no height.
export function parseImageHeight(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? clampImageHeightPct(value) : null;
  }
  if (typeof value !== "string") return null;
  const match = /^\s*(\d+(?:\.\d+)?)\s*%?\s*$/.exec(value);
  if (!match) return null;
  return clampImageHeightPct(Number(match[1]));
}

// Drag direction per corner: east corners grow right, west corners mirror the
// same width-% change so every visible handle stays live (no height model, so
// no north/south handles — a visible-but-dead handle is worse than none).
export type ImageResizeDirection = 1 | -1;

// WHY: Pure corner-drag math so the mapping is unit-testable without a DOM —
// same width-% attr as the old east-only drag, no new model.
export function widthPctAfterDrag(
  startWidthPct: number,
  deltaXPx: number,
  baseWidthPx: number,
  direction: ImageResizeDirection
): number {
  if (!Number.isFinite(deltaXPx) || !(baseWidthPx > 0)) return clampImageWidthPct(startWidthPct);
  const deltaPct = (deltaXPx / baseWidthPx) * 100;
  return clampImageWidthPct(Math.round(startWidthPct + direction * deltaPct));
}

// WHY: Height reuses width's unit (% of page width), so vertical pixels map
// through the same base — south grows downward, north mirrors it.
export function heightPctAfterDrag(
  startHeightPct: number,
  deltaYPx: number,
  baseWidthPx: number,
  direction: ImageResizeDirection
): number {
  if (!Number.isFinite(deltaYPx) || !(baseWidthPx > 0)) return clampImageHeightPct(startHeightPct);
  const deltaPct = (deltaYPx / baseWidthPx) * 100;
  return clampImageHeightPct(Math.round(startHeightPct + direction * deltaPct));
}

// WHY: Corners preserve the *current* ratio (natural or already distorted,
// Docs-like) — never a surprise snap. Null stays null: an aspect-locked image
// corner-drags back to aspect-locked.
export function proportionalHeightForWidth(
  oldWidthPct: number,
  oldHeightPct: number | null,
  newWidthPct: number
): number | null {
  if (oldHeightPct === null) return null;
  if (!(oldWidthPct > 0)) return clampImageHeightPct(oldHeightPct);
  return clampImageHeightPct(Math.round((oldHeightPct * newWidthPct) / oldWidthPct));
}

// WHY: First height drag on an aspect-locked image must start somewhere real —
// stored naturals first (uploads), live DOM dimensions next (remote URLs),
// else null so the drag is ignored instead of inventing a size.
export function initialHeightPct(
  widthPct: number,
  storedNatural: { width: number; height: number } | null,
  measuredNatural: { width: number; height: number } | null
): number | null {
  const source =
    storedNatural && storedNatural.width > 0 && storedNatural.height > 0
      ? storedNatural
      : measuredNatural && measuredNatural.width > 0 && measuredNatural.height > 0
        ? measuredNatural
        : null;
  if (!source) return null;
  return clampImageHeightPct(Math.round((widthPct * source.height) / source.width));
}

// Every visible handle stays live: corners scale proportionally, east/west
// drive width, north/south drive height. Exactly two tab stops (south-east =
// width slider, south = height slider); the rest are pointer-only.
const IMAGE_HANDLES: ReadonlyArray<{
  handle: "ne" | "se" | "nw" | "sw" | "e" | "w" | "n" | "s";
  axis: "width" | "height" | "both";
  direction: ImageResizeDirection;
  slider: "width" | "height" | null;
}> = [
  { handle: "ne", axis: "both", direction: 1, slider: null },
  { handle: "se", axis: "both", direction: 1, slider: "width" },
  { handle: "sw", axis: "both", direction: -1, slider: null },
  { handle: "nw", axis: "both", direction: -1, slider: null },
  { handle: "e", axis: "width", direction: 1, slider: null },
  { handle: "w", axis: "width", direction: -1, slider: null },
  { handle: "s", axis: "height", direction: 1, slider: "height" },
  { handle: "n", axis: "height", direction: -1, slider: null },
];

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const widthPct = clampImageWidthPct(
    typeof node.attrs.width === "number" ? node.attrs.width : parseImageWidth(node.attrs.width)
  );
  const storedHeightPct = parseImageHeight(node.attrs.height);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startWidthPct: number;
    startHeightPct: number | null;
    baseWidthPx: number;
    axis: "width" | "height" | "both";
    direction: ImageResizeDirection;
  } | null>(null);

  const readMeasuredNatural = (wrapper: HTMLElement | null): { width: number; height: number } | null => {
    const img = wrapper?.querySelector("img");
    if (!img || !(img.naturalWidth > 0) || !(img.naturalHeight > 0)) return null;
    return { width: img.naturalWidth, height: img.naturalHeight };
  };

  const readStoredNatural = (): { width: number; height: number } | null => {
    const naturalWidth = node.attrs.naturalWidth;
    const naturalHeight = node.attrs.naturalHeight;
    return typeof naturalWidth === "number" && typeof naturalHeight === "number"
      ? { width: naturalWidth, height: naturalHeight }
      : null;
  };

  const handlePointerDown =
    (axis: "width" | "height" | "both", direction: ImageResizeDirection) =>
    (event: React.PointerEvent<HTMLSpanElement>) => {
      // WHY: Stop the browser's native image drag so the gesture resizes only.
      event.preventDefault();
      event.stopPropagation();
      const wrapper = event.currentTarget.parentElement as HTMLElement | null;
      const editorElement = wrapper?.closest(".tiptap") as HTMLElement | null;
      const baseWidthPx = editorElement?.clientWidth || wrapper?.clientWidth || 1;
      // WHY: Height drags need a real starting size — initialize from naturals
      // (or live pixels) on first touch; abort the gesture when neither exists
      // rather than inventing a distorted frame.
      const startHeightPct =
        axis === "width"
          ? storedHeightPct
          : (storedHeightPct ?? initialHeightPct(widthPct, readStoredNatural(), readMeasuredNatural(wrapper)));
      if (axis !== "width" && startHeightPct === null) return;
      dragState.current = {
        startX: event.clientX,
        startY: event.clientY,
        startWidthPct: widthPct,
        startHeightPct,
        baseWidthPx,
        axis,
        direction,
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const state = dragState.current;
        if (!state) return;
        if (state.axis === "height") {
          updateAttributes({
            height: heightPctAfterDrag(
              state.startHeightPct ?? widthPct,
              moveEvent.clientY - state.startY,
              state.baseWidthPx,
              state.direction
            ),
          });
          return;
        }
        const nextWidth = widthPctAfterDrag(
          state.startWidthPct,
          moveEvent.clientX - state.startX,
          state.baseWidthPx,
          state.direction
        );
        if (state.axis === "width") {
          updateAttributes({ width: nextWidth });
          return;
        }
        const nextHeight = proportionalHeightForWidth(state.startWidthPct, state.startHeightPct, nextWidth);
        updateAttributes(nextHeight === null ? { width: nextWidth } : { width: nextWidth, height: nextHeight });
      };
      const handlePointerUp = () => {
        dragState.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    };

  // WHY: Arrow keys mirror the drags for keyboard users — one slider per axis.
  const handleWidthKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      updateAttributes({ width: clampImageWidthPct(widthPct + 5) });
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      updateAttributes({ width: clampImageWidthPct(widthPct - 5) });
    }
  };

  const handleHeightKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    const base = storedHeightPct ?? widthPct;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      updateAttributes({ height: clampImageHeightPct(base + 5) });
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      updateAttributes({ height: clampImageHeightPct(base - 5) });
    }
  };

  // WHY: aspect-ratio on the image itself (not the wrapper) so the frame works
  // identically in the editor and in static HTML export — both resolve the
  // same W/H pair in % of page width. Null height = aspect-locked (legacy).
  const frameStyle =
    storedHeightPct === null
      ? ({ width: "100%", height: "auto", display: "block" }) as const
      : ({
          width: "100%",
          height: "auto",
          display: "block",
          aspectRatio: `${widthPct} / ${storedHeightPct}`,
        }) as const;

  return (
    <NodeViewWrapper as="div" className="resizable-image" style={{ width: `${widthPct}%` }}>
      <img
        src={node.attrs.src as string}
        alt={(node.attrs.alt as string | null) ?? ""}
        title={(node.attrs.title as string | null) ?? undefined}
        style={frameStyle}
      />
      {selected
        ? IMAGE_HANDLES.map(({ handle, axis, direction, slider }) =>
            slider === null ? (
              <span
                key={handle}
                aria-hidden="true"
                className={`no-print image-resize-handle image-resize-${handle}`}
                onPointerDown={handlePointerDown(axis, direction)}
              />
            ) : (
              <span
                key={handle}
                role="slider"
                tabIndex={0}
                aria-label={slider === "width" ? "Resize image width" : "Resize image height"}
                aria-valuenow={slider === "width" ? widthPct : (storedHeightPct ?? widthPct)}
                aria-valuemin={slider === "width" ? MIN_IMAGE_WIDTH_PCT : MIN_IMAGE_HEIGHT_PCT}
                aria-valuemax={slider === "width" ? MAX_IMAGE_WIDTH_PCT : MAX_IMAGE_HEIGHT_PCT}
                className={`no-print image-resize-handle image-resize-${handle}`}
                onPointerDown={handlePointerDown(axis, direction)}
                onKeyDown={slider === "width" ? handleWidthKeyDown : handleHeightKeyDown}
              />
            )
          )
        : null}
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
      // WHY: Optional independent height (% of page width, same unit as width)
      // for Word-style 1D stretch. Null = aspect-locked: legacy docs and every
      // untouched image render exactly as before.
      height: {
        default: null,
        parseHTML: (element) =>
          parseImageHeight(element.getAttribute("data-image-height") || element.style.height),
        renderHTML: (attributes) => {
          const height = parseImageHeight(attributes.height);
          if (height === null) return {};
          const width = parseImageWidth(attributes.width) ?? DEFAULT_IMAGE_WIDTH_PCT;
          return {
            "data-image-height": String(height),
            style: `height: ${height}%; aspect-ratio: ${width} / ${height}`,
          };
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
