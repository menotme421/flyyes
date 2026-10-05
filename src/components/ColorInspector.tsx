import { hslToHex } from "@/editor/honeycombWheel";
import { wcagTag, type HarmonyKind } from "@/editor/colorScience";

// WHY: Inspector lives behind an info icon (dialog) instead of always below
// the wheel — full detail on demand without doubling the picker's height.

export interface ColorInspectorProperties {
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
}

export function ColorInspector({ selectedHex, h, s, l, rgb, hsv, cmyk, ratioWhite, ratioBlack, harmonies, onSelect }: ColorInspectorProperties) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-8 w-8 rounded border border-border"
          style={{ backgroundColor: selectedHex }}
        />
        <div className="flex flex-col">
          <span className="font-mono text-sm font-semibold">{selectedHex}</span>
          <span className="text-xs text-muted-foreground">
            hsl({Math.round(h)}, {Math.round(s)}%, {Math.round(l)}%)
          </span>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-0.5 font-mono text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">RGB</dt>
          <dd>{`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">HSV</dt>
          <dd>{`hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">CMYK</dt>
          <dd>{`cmyk(${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k})`}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1 text-xs">
        <ContrastRow label="on white" ratio={ratioWhite} />
        <ContrastRow label="on black" ratio={ratioBlack} />
      </div>
      <div className="flex flex-col gap-1.5">
        {harmonies.map((harmony) => (
          <div key={harmony.kind} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-xs text-muted-foreground">{harmony.label}</span>
            <span className="flex gap-1">
              {harmony.hues.map((hue) => {
                const hex = hslToHex(hue, s, l);
                return (
                  <button
                    key={`${harmony.kind}-${hue}`}
                    type="button"
                    title={hex}
                    aria-label={`Apply ${harmony.label.toLowerCase()} ${hex}`}
                    className="h-6 w-6 rounded border border-border"
                    style={{ backgroundColor: hex }}
                    onClick={() => onSelect(hex)}
                  />
                );
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContrastRow({ label, ratio }: { label: string; ratio: number }) {
  const tag = wcagTag(ratio);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-mono">
        {ratio.toFixed(2)}
        <span
          className={`rounded border px-1 text-[10px] font-semibold ${
            tag === "AAA"
              ? "border-primary bg-primary text-primary-foreground"
              : tag === "AA"
                ? "border-border bg-muted text-foreground"
                : "border-destructive/50 text-destructive"
          }`}
        >
          {tag}
        </span>
      </span>
    </div>
  );
}
