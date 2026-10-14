// WHY: Native select — single-value picker with full keyboard + screen-reader
// semantics for free, zero floating-UI risk inside sticky bars. Screen-only
// scaling — saved content, export, and print are unaffected.

const ZOOM_STEPS = [50, 75, 90, 100, 125, 150, 200] as const;

interface ZoomSelectProperties {
  zoomPercent: number;
  onZoomChange: (nextZoom: number) => void;
}

export function ZoomSelect({ zoomPercent, onZoomChange }: ZoomSelectProperties) {
  return (
    <div className="w-28">
      <label htmlFor="zoom" className="sr-only">
        Zoom
      </label>
      <select
        id="zoom"
        value={`${zoomPercent}%`}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (Number.isFinite(parsed)) {
            onZoomChange(Math.min(200, Math.max(50, parsed)));
          }
        }}
        className="h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs outline-none"
      >
        {ZOOM_STEPS.map((step) => (
          <option key={step} value={`${step}%`}>
            {step}%
          </option>
        ))}
      </select>
    </div>
  );
}
