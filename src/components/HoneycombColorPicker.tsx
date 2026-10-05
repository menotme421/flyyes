import { useCallback, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  buildGrayscale,
  buildHoneycomb,
  DEFAULT_CELL_RADIUS,
  hexPolygonPoints,
  neighborInDirection,
} from "@/editor/honeycombWheel";
import {
  contrastRatio,
  harmonyHues,
  hexToRgb,
  nearestColorName,
  rgbToCmyk,
  rgbToHsv,
  snapToClosestCell,
  type HarmonyKind,
} from "@/editor/colorScience";
import { ColorInspector } from "./ColorInspector";

// WHY: Standalone production honeycomb picker (classic Office Colors dialog) —
// pure SVG pointy-top hexagons, procedural 127-cell HSL wheel, grayscale ramp,
// white cell, enlarged preview with double halo, scrub selection, tooltips with
// names, hex input with snap-to-closest, arrow-key nav, and a full inspector
// (conversions, WCAG, harmonies). Zero new dependencies.

interface SelectableCell {
  id: string;
  cx: number;
  cy: number;
  hex: string;
  h: number;
  s: number;
  l: number;
}

interface HoneycombColorPickerProperties {
  value?: string | null;
  onSelect: (hex: string) => void;
  onHover?: (hex: string | null) => void;
  radius?: number;
}

/** Accepts "#RRGGBB", "RRGGBB", "#RGB" (anything else → null). Exported for tests. */
export function normalizeHexField(raw: string): string | null {
  const trimmed = raw.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-f]{6}$/i.test(withHash)) return withHash.toUpperCase();
  const short = /^#([0-9a-f]{3})$/i.exec(withHash);
  if (!short) return null;
  const [red, green, blue] = short[1].split("");
  return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase();
}

export function HoneycombColorPicker({
  value,
  onSelect,
  onHover,
  radius = DEFAULT_CELL_RADIUS,
}: HoneycombColorPickerProperties) {
  const layout = useMemo(() => buildHoneycomb(radius), [radius]);
  const svgReference = useRef<SVGSVGElement>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ id: string; hex: string; name: string; x: number; y: number } | null>(null);
  const [hexDraft, setHexDraft] = useState("");
  const [hexError, setHexError] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const grayTopY = layout.maxY + radius * 2.4;
  const grays = useMemo(() => buildGrayscale(radius, grayTopY), [radius, grayTopY]);
  const whiteCy = grayTopY + 1.5 * radius;
  const previewRadius = radius * 1.65;

  const selectables: SelectableCell[] = useMemo(
    () => [
      ...layout.cells.map((cell) => ({
        id: cell.id,
        cx: cell.cx,
        cy: cell.cy,
        hex: cell.hex,
        h: cell.h,
        s: cell.s,
        l: cell.l,
      })),
      ...grays.map((gray) => ({
        id: gray.id,
        cx: gray.cx,
        cy: gray.cy,
        hex: gray.hex,
        h: 0,
        s: 0,
        l: gray.lightness,
      })),
      { id: "white", cx: layout.minX, cy: whiteCy, hex: "#FFFFFF", h: 0, s: 0, l: 100 },
    ],
    [layout, grays, whiteCy]
  );

  const selected =
    (value ? snapToClosestCell(selectables, value) : null) ??
    selectables.find((cell) => cell.id === "c0,0") ??
    selectables[0];

  // WHY: viewBox computed from real bounds so wheel + ramp + preview halo fit exactly.
  // The preview hexagon is 1.65× cell size plus halo — it, not the wheel,
  // sets the right edge (forgetting this clipped it, as reported).
  const pad = 6;
  const minVx = layout.minX - radius - pad;
  const maxVx = Math.max(layout.maxX + radius, layout.maxX + previewRadius + 7) + pad;
  const minVy = layout.minY - radius - pad;
  const maxVy = Math.max(grayTopY + 1.5 * radius + radius, whiteCy + previewRadius + 5) + pad;

  function applyCell(cell: SelectableCell): void {
    onSelect(cell.hex);
    onHover?.(cell.hex);
  }

  function applyId(id: string): void {
    const cell = selectables.find((candidate) => candidate.id === id);
    if (cell) applyCell(cell);
  }

  function focusCell(id: string): void {
    const element = svgReference.current?.querySelector(
      `[data-honey-id="${CSS.escape(id)}"]`
    ) as unknown as { focus: () => void } | null;
    element?.focus();
  }

  // WHY: Single hover pipeline for mouse + scrub — hit-test from cursor
  // coordinates at the container level instead of per-polygon mouseenter,
  // which stopped firing after re-renders and froze the tooltip on one cell.
  // WHY: Returns the cell for scrub callers. Gaps between hexagons return the
  // previous tooltip untouched (no flicker); leaving the svg clears it.
  const hoverAt = useCallback((clientX: number, clientY: number): SelectableCell | null => {
    const target = document.elementFromPoint(clientX, clientY);
    const id = target instanceof Element
      ? target.closest("[data-honey-id]")?.getAttribute("data-honey-id")
      : null;
    if (!id) return null;
    const cell = selectables.find((candidate) => candidate.id === id);
    if (!cell) return null;
    const rect = svgReference.current?.getBoundingClientRect();
    if (!rect) return null;
    setTooltip({
      id: cell.id,
      hex: cell.hex,
      name: nearestColorName(cell.hex) ?? "Custom color",
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
    onHover?.(cell.hex);
    return cell;
  }, [selectables, onHover]);
  const hoverAtRef = useRef(hoverAt);
  hoverAtRef.current = hoverAt;

  function hideTooltip(): void {
    setTooltip(null);
    onHover?.(null);
  }

  // WHY: Window-level move tracking lets scrubbing glide across cells with zero
  // latency (per-cell enter events alone drop fast drags). Listeners attach
  // synchronously inside pointerdown — never in an effect — so a quick click
  // (down+up before re-render) can't leave scrubbing stuck on with a frozen
  // tooltip. Everything detaches on pointerup/pointercancel.
  function beginScrub(event: React.PointerEvent, id: string): void {
    event.preventDefault();
    applyId(id);
    const handleMove = (moveEvent: PointerEvent) => {
      const cell = hoverAtRef.current(moveEvent.clientX, moveEvent.clientY);
      if (cell) onSelect(cell.hex);
    };
    const endScrub = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", endScrub);
      window.removeEventListener("pointercancel", endScrub);
      hideTooltip();
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", endScrub);
    window.addEventListener("pointercancel", endScrub);
  }

  function handleCellKeyDown(event: React.KeyboardEvent<SVGPolygonElement>, cell: SelectableCell): void {
    const directions = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    } as const;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      applyCell(cell);
      return;
    }
    const direction = directions[event.key as keyof typeof directions];
    if (!direction) return;
    event.preventDefault();
    const nextId = neighborInDirection(selectables, cell.id, direction);
    if (nextId) {
      applyId(nextId);
      focusCell(nextId);
    }
  }

  function handleHexApply(): void {
    const normalized = normalizeHexField(hexDraft);
    if (!normalized) {
      setHexError("Enter a hex color like #3B82F6.");
      return;
    }
    setHexError(null);
    setHexDraft("");
    const closest = snapToClosestCell(selectables, normalized);
    if (closest) {
      onSelect(closest.hex);
      focusCell(closest.id);
    }
  }

  const selectedRgb = hexToRgb(selected.hex) ?? { r: 255, g: 255, b: 255 };
  const selectedHsv = rgbToHsv(selectedRgb.r, selectedRgb.g, selectedRgb.b);
  const selectedCmyk = rgbToCmyk(selectedRgb.r, selectedRgb.g, selectedRgb.b);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const ratioWhite = contrastRatio(selectedRgb, white);
  const ratioBlack = contrastRatio(selectedRgb, black);

  const harmonies: Array<{ kind: HarmonyKind; label: string; hues: number[] }> = [
    { kind: "complementary", label: "Complementary", hues: harmonyHues(selected.h, "complementary") },
    { kind: "triadic", label: "Triadic", hues: harmonyHues(selected.h, "triadic") },
    { kind: "analogous", label: "Analogous", hues: harmonyHues(selected.h, "analogous") },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        {/* WHY: Info icon floats over the wheel's empty top-right corner —
            the top row is only 7 cells wide, so no colors hide beneath it. */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Color details"
          title="Color details"
          className="absolute top-0 right-0 z-10 h-7 w-7 bg-background/80"
          onClick={() => setInspectorOpen(true)}
        >
          <Info className="h-4 w-4" />
        </Button>
        <svg
          ref={svgReference}
          viewBox={`${minVx} ${minVy} ${maxVx - minVx} ${maxVy - minVy}`}
          className="h-auto w-full"
          role="group"
          aria-label="Honeycomb color picker"
          onMouseMove={(event) => {
            hoverAt(event.clientX, event.clientY);
          }}
          onMouseLeave={() => hideTooltip()}
        >
          {selectables.map((cell) => (
            <polygon
              key={cell.id}
              data-honey-id={cell.id}
              points={hexPolygonPoints(cell.cx, cell.cy, radius)}
              fill={cell.hex}
              stroke={cell.id === "white" ? "rgba(0,0,0,0.18)" : "none"}
              strokeWidth={cell.id === "white" ? 1 : 0}
              tabIndex={0}
              role="button"
              aria-label={`${cell.hex} ${nearestColorName(cell.hex) ?? ""}`}
              className="cursor-pointer outline-none"
              onPointerDown={(event) => beginScrub(event, cell.id)}
              onFocus={() => {
                setFocusedId(cell.id);
                // WHY: viewBox units → pixels (the svg scales responsively).
                const rect = svgReference.current?.getBoundingClientRect();
                const scale = rect ? rect.width / (maxVx - minVx) : 1;
                setTooltip((current) =>
                  current?.id === cell.id
                    ? current
                    : {
                        id: cell.id,
                        hex: cell.hex,
                        name: nearestColorName(cell.hex) ?? "Custom color",
                        x: (cell.cx - minVx) * scale,
                        y: (cell.cy - minVy) * scale,
                      }
                );
                onHover?.(cell.hex);
              }}
              onBlur={() => {
                setFocusedId((current) => (current === cell.id ? null : current));
                hideTooltip();
              }}
              onKeyDown={(event) => handleCellKeyDown(event, cell)}
            />
          ))}
          {/* Selected + keyboard-focus double halo (inner white, outer dark),
              plus a single halo tracking the hovered cell so hovering
              visibly reacts, not just the New/Current strip. */}
          {[selected.id, focusedId].filter(Boolean).map((id) => {
            const cell = selectables.find((candidate) => candidate.id === id);
            if (!cell) return null;
            return (
              <g key={`halo-${id}`} pointerEvents="none" aria-hidden="true">
                <polygon
                  points={hexPolygonPoints(cell.cx, cell.cy, radius + 1.2)}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={1.6}
                />
                <polygon
                  points={hexPolygonPoints(cell.cx, cell.cy, radius + 3)}
                  fill="none"
                  stroke="#111827"
                  strokeWidth={1.4}
                />
              </g>
            );
          })}
          {tooltip && tooltip.id !== selected.id && tooltip.id !== focusedId
            ? (() => {
                const hovered = selectables.find((candidate) => candidate.id === tooltip.id);
                if (!hovered) return null;
                return (
                  <polygon
                    key="halo-hover"
                    points={hexPolygonPoints(hovered.cx, hovered.cy, radius + 1.2)}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1.6}
                    pointerEvents="none"
                    aria-hidden="true"
                  />
                );
              })()
            : null}
          {/* Standalone preview hexagon (bottom-right) with authentic halo.
              Follows hover so the popover reacts live; falls back to selected. */}
          <PreviewHexagon
            cx={layout.maxX}
            cy={whiteCy}
            previewRadius={previewRadius}
            hex={
              (tooltip
                ? selectables.find((candidate) => candidate.id === tooltip.id)?.hex
                : undefined) ?? selected.hex
            }
          />
        </svg>
        {tooltip ? (
          <span
            role="status"
            className="pointer-events-none absolute z-10 rounded-md bg-primary px-2 py-1 text-xs whitespace-nowrap text-primary-foreground shadow-md"
            style={{ left: tooltip.x, top: tooltip.y - 12, transform: "translate(-50%, -100%)" }}
          >
            {tooltip.hex} · {tooltip.name}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={hexDraft}
          onChange={(event) => setHexDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") handleHexApply(); }}
          placeholder="#RRGGBB"
          title="Type a hex color — Enter snaps to closest"
          aria-label="Custom hex color"
          maxLength={7}
          className="h-9 font-mono uppercase"
        />
        <Button size="sm" onClick={handleHexApply}>
          Apply
        </Button>
      </div>
      {hexError ? <p className="-mt-1 text-xs text-destructive">{hexError}</p> : null}

      <InspectorDialog
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        selectedHex={selected.hex}
        h={selected.h}
        s={selected.s}
        l={selected.l}
        rgb={selectedRgb}
        hsv={selectedHsv}
        cmyk={selectedCmyk}
        ratioWhite={ratioWhite}
        ratioBlack={ratioBlack}
        harmonies={harmonies}
        onSelect={onSelect}
      />
    </div>
  );
}

function InspectorDialog({ open, onClose, selectedHex, h, s, l, rgb, hsv, cmyk, ratioWhite, ratioBlack, harmonies, onSelect }: {
  open: boolean;
  onClose: () => void;
  selectedHex: string;
  h: number;
  s: number;
  l: number;
  rgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  cmyk: { c: number; m: number; y: number; k: number };
  ratioWhite: number;
  ratioBlack: number;
  harmonies: Array<{ kind: HarmonyKind; label: string; hues: number[] }>;
  onSelect: (hex: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Color details</DialogTitle>
          <DialogDescription>Formats, contrast, and harmonies.</DialogDescription>
        </DialogHeader>
        <ColorInspector
          selectedHex={selectedHex}
          h={h}
          s={s}
          l={l}
          rgb={rgb}
          hsv={hsv}
          cmyk={cmyk}
          ratioWhite={ratioWhite}
          ratioBlack={ratioBlack}
          harmonies={harmonies}
          onSelect={onSelect}
        />
      </DialogContent>
    </Dialog>
  );
}

function PreviewHexagon({ cx, cy, previewRadius, hex }: {
  cx: number;
  cy: number;
  previewRadius: number;
  hex: string;
}) {
  return (
    <g aria-hidden="true" pointerEvents="none">
      <polygon
        points={hexPolygonPoints(cx, cy, previewRadius)}
        fill={hex}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth={1}
      />
      <polygon
        points={hexPolygonPoints(cx, cy, previewRadius + 2.5)}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.5}
      />
      <polygon
        points={hexPolygonPoints(cx, cy, previewRadius + 5.5)}
        fill="none"
        stroke="#111827"
        strokeWidth={1.5}
      />
    </g>
  );
}
