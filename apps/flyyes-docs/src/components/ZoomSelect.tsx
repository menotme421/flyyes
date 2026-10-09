import { Dropdown } from "@carbon/react";

// WHY: Compact zoom picker on Carbon Dropdown (Docs keeps zoom in its toolbar
// too). Screen-only scaling — saved content, export, and print are unaffected.

const ZOOM_STEPS = [50, 75, 90, 100, 125, 150, 200] as const;

interface ZoomSelectProperties {
  zoomPercent: number;
  onZoomChange: (nextZoom: number) => void;
}

export function ZoomSelect({ zoomPercent, onZoomChange }: ZoomSelectProperties) {
  return (
    <div className="w-28">
      <Dropdown
        id="zoom"
        titleText="Zoom"
        hideLabel
        label="100%"
        size="sm"
        items={ZOOM_STEPS.map((step) => `${step}%`)}
        selectedItem={`${zoomPercent}%`}
        onChange={(data) => {
          const parsed = Number.parseInt(data.selectedItem ?? "", 10);
          if (Number.isFinite(parsed)) {
            onZoomChange(Math.min(200, Math.max(50, parsed)));
          }
        }}
      />
    </div>
  );
}
