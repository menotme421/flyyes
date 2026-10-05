import { useState } from "react";

// WHY: Word-style table grid picker (10×8 like Word — the smaller option you picked).
// Hover highlights the rectangle, label shows "4 × 3 Table", click inserts it.
// Pure clamp helper is exported for unit tests.

export const GRID_MAX_COLS = 10;
export const GRID_MAX_ROWS = 8;

export function clampGridSize(cols: number, rows: number): { cols: number; rows: number } {
  const cleanCols = Number.isFinite(cols) ? Math.round(cols) : 1;
  const cleanRows = Number.isFinite(rows) ? Math.round(rows) : 1;
  return {
    cols: Math.min(GRID_MAX_COLS, Math.max(1, cleanCols)),
    rows: Math.min(GRID_MAX_ROWS, Math.max(1, cleanRows)),
  };
}

interface TableGridPickerProperties {
  onSelect: (cols: number, rows: number) => void;
}

export function TableGridPicker({ onSelect }: TableGridPickerProperties) {
  // WHY: Hover cell (not focus) drives the highlight — mouse users see the
  // rectangle grow; keyboard users tab through cells and Enter to insert.
  const [hover, setHover] = useState<{ cols: number; rows: number } | null>(null);

  return (
    <div onMouseLeave={() => setHover(null)}>
      <p className="mb-2 text-center text-xs text-muted-foreground" aria-live="polite">
        {hover ? `${hover.cols} × ${hover.rows} Table` : "Insert table"}
      </p>
      <div
        role="grid"
        aria-label="Table size picker"
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${GRID_MAX_COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: GRID_MAX_ROWS }, (_, rowIndex) =>
          Array.from({ length: GRID_MAX_COLS }, (_, colIndex) => {
            const cols = colIndex + 1;
            const rows = rowIndex + 1;
            const highlighted = hover !== null && cols <= hover.cols && rows <= hover.rows;
            return (
              <button
                key={`${cols}x${rows}`}
                type="button"
                role="gridcell"
                aria-label={`${cols} by ${rows} table`}
                className={`h-4 w-4 rounded-[3px] border ${
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
  );
}
