import { useState } from "react";

// WHY: Word/Google-style expandable grid picker. Shows 10×10 by default and
// grows by one row/col as the cursor touches the edge, up to a 20×20 cap
// (huge tables freeze the page, so the cap is enforced by clampGridSize).
// Pure helpers are exported for unit tests.

export const GRID_INITIAL_COLS = 10;
export const GRID_INITIAL_ROWS = 10;
export const GRID_MAX_COLS = 20;
export const GRID_MAX_ROWS = 20;

export function clampGridSize(cols: number, rows: number): { cols: number; rows: number } {
  const cleanCols = Number.isFinite(cols) ? Math.round(cols) : 1;
  const cleanRows = Number.isFinite(rows) ? Math.round(rows) : 1;
  return {
    cols: Math.min(GRID_MAX_COLS, Math.max(1, cleanCols)),
    rows: Math.min(GRID_MAX_ROWS, Math.max(1, cleanRows)),
  };
}

// WHY: Visible size is derived from hover (not stored state) so the grid
// shrinks back automatically when the cursor moves away from the edge.
export function computeVisibleSize(hover: { cols: number; rows: number } | null): {
  cols: number;
  rows: number;
} {
  if (hover === null) return { cols: GRID_INITIAL_COLS, rows: GRID_INITIAL_ROWS };
  const cleanCols = Number.isFinite(hover.cols) ? Math.round(hover.cols) : 1;
  const cleanRows = Number.isFinite(hover.rows) ? Math.round(hover.rows) : 1;
  return {
    cols: Math.min(GRID_MAX_COLS, Math.max(GRID_INITIAL_COLS, cleanCols + 1)),
    rows: Math.min(GRID_MAX_ROWS, Math.max(GRID_INITIAL_ROWS, cleanRows + 1)),
  };
}

interface TableGridPickerProperties {
  onSelect: (cols: number, rows: number) => void;
}

export function TableGridPicker({ onSelect }: TableGridPickerProperties) {
  // WHY: Hover cell (not focus) drives the highlight — mouse users see the
  // rectangle grow; keyboard users tab through cells and Enter to insert.
  const [hover, setHover] = useState<{ cols: number; rows: number } | null>(null);

  const visible = computeVisibleSize(hover);

  return (
    <div
      onMouseLeave={() => {
        setHover(null);
      }}
    >
      <p className="cds--type-label-01 fly-section-label text-center text-muted-foreground" aria-live="polite">
        {hover ? `${hover.cols} × ${hover.rows} Table` : "Insert table"}
      </p>
      <div className="flex justify-center">
        <div
          role="grid"
          aria-label="Table size picker"
          className="grid w-max gap-0.5"
          style={{ gridTemplateColumns: `repeat(${visible.cols}, 0.75rem)` }}
        >
          {Array.from({ length: visible.rows }, (_, rowIndex) =>
            Array.from({ length: visible.cols }, (_, colIndex) => {
              const cols = colIndex + 1;
              const rows = rowIndex + 1;
              const highlighted = hover !== null && cols <= hover.cols && rows <= hover.rows;
              return (
                <button
                  key={`${cols}x${rows}`}
                  type="button"
                  role="gridcell"
                  aria-label={`${cols} by ${rows} table`}
                  className={`fly-swatch h-3 w-3 rounded-[3px] ${
                    highlighted
                      ? "border-primary bg-primary/70"
                      : "border-border bg-background hover:border-primary"
                  }`}
                  onMouseEnter={() => setHover({ cols, rows })}
                  onFocus={() => setHover({ cols, rows })}
                  onClick={() => {
                    const size = clampGridSize(cols, rows);
                    onSelect(size.cols, size.rows);
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
