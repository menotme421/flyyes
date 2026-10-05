import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// WHY: Compact zoom picker on shadcn Select (Docs keeps zoom in its toolbar too).
// Screen-only scaling — saved content, export, and print are unaffected.

const ZOOM_STEPS = [50, 75, 90, 100, 125, 150, 200] as const;

interface ZoomSelectProperties {
  zoomPercent: number;
  onZoomChange: (nextZoom: number) => void;
}

export function ZoomSelect({ zoomPercent, onZoomChange }: ZoomSelectProperties) {
  return (
    <Select
      value={String(zoomPercent)}
      onValueChange={(value) => {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) {
          onZoomChange(Math.min(200, Math.max(50, parsed)));
        }
      }}
    >
      <SelectTrigger aria-label="Zoom" className="h-8 w-20 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ZOOM_STEPS.map((step) => (
          <SelectItem key={step} value={String(step)}>
            {step}%
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
