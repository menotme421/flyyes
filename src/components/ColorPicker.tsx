import { useRef, useState } from "react";
import { Button, ContentSwitcher, Modal, Popover, PopoverContent, Switch, TextInput } from "@carbon/react";
import { HoneycombColorPicker } from "./HoneycombColorPicker";

// WHY: Word-style color picking for the whole app — the native <input type=color>
// popup is browser chrome and cannot be styled. Standard tab = procedural
// 127-cell HSL honeycomb (vivid, no muddy picks) + grayscale + preview +
// full inspector, like Word's Colors dialog. Custom tab = spectrum square +
// hue slider + hex. Two shells share the body: popover for toolbar buttons,
// dialog for inside menus (a popover nested in a menu would close it).

// WHY: Accepts "#3B82F6", "3B82F6", "#abc" — rejects everything else so only
// clean hex reaches documents (and DOCX shading).
export function normalizeHexInput(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const sixDigit = /^#?([0-9a-f]{6})$/.exec(trimmed);
  if (sixDigit) return `#${sixDigit[1]}`;
  const threeDigit = /^#?([0-9a-f]{3})$/.exec(trimmed);
  if (threeDigit) {
    const [red, green, blue] = threeDigit[1].split("");
    return `#${red}${red}${green}${green}${blue}${blue}`;
  }
  return null;
}

// WHY: Hex <-> HSV math for the Custom spectrum tab. Floats stay unrounded
// internally so hex→hsv→hex round-trips exactly (tests pin this).
export interface HsvColor {
  h: number;
  s: number;
  v: number;
}

export function hexToHsv(hex: string): HsvColor | null {
  const normalized = normalizeHexInput(hex);
  if (!normalized) return null;
  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return {
    h: hue,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

export function hsvToHex(hue: number, saturation: number, value: number): string {
  const sat = Math.min(100, Math.max(0, saturation)) / 100;
  const val = Math.min(100, Math.max(0, value)) / 100;
  const chroma = val * sat;
  const sector = (((hue % 360) + 360) % 360) / 60;
  const mid = chroma * (1 - Math.abs((sector % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;
  if (sector < 1) { red = chroma; green = mid; }
  else if (sector < 2) { red = mid; green = chroma; }
  else if (sector < 3) { green = chroma; blue = mid; }
  else if (sector < 4) { green = mid; blue = chroma; }
  else if (sector < 5) { red = mid; blue = chroma; }
  else { red = chroma; blue = mid; }
  const lift = val - chroma;
  const toHex = (channel: number) =>
    Math.round((channel + lift) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

// WHY: Custom tab — saturation/value square + hue slider + hex, like Word's
// Custom Colors dialog (minus eyedropper/alpha: our colors are opaque hex
// everywhere, including DOCX). Pointer-capture dragging works for mouse and
// touch; the hex field stays editable for exact values.
export function SpectrumPicker({ initialHex, onApply, onPreviewChange }: {
  initialHex?: string | null;
  onApply: (hex: string) => void;
  onPreviewChange?: (hex: string | null) => void;
}) {
  const initial = initialHex ? hexToHsv(initialHex) : null;
  const [hue, setHue] = useState(initial?.h ?? 0);
  const [saturation, setSaturation] = useState(initial?.s ?? 100);
  const [brightness, setBrightness] = useState(initial?.v ?? 100);
  const [draft, setDraft] = useState<string | null>(null);
  const squareReference = useRef<HTMLDivElement>(null);
  const hueReference = useRef<HTMLDivElement>(null);

  const hex = hsvToHex(hue, saturation, brightness);
  const shownHex = draft ?? hex;
  const hueColor = `hsl(${Math.round(hue)}, 100%, 50%)`;

  function updateFromSquare(clientX: number, clientY: number): void {
    const rect = squareReference.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const nextSaturation = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const nextBrightness = Math.min(100, Math.max(0, (1 - (clientY - rect.top) / rect.height) * 100));
    setSaturation(nextSaturation);
    setBrightness(nextBrightness);
    setDraft(null);
    onPreviewChange?.(hsvToHex(hue, nextSaturation, nextBrightness));
  }

  function updateHue(clientX: number): void {
    const rect = hueReference.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const nextHue = Math.min(360, Math.max(0, ((clientX - rect.left) / rect.width) * 360));
    setHue(nextHue);
    setDraft(null);
    onPreviewChange?.(hsvToHex(nextHue, saturation, brightness));
  }

  function commitDraft(): void {
    if (draft === null) return;
    const parsed = hexToHsv(draft);
    if (parsed) {
      setHue(parsed.h);
      setSaturation(parsed.s);
      setBrightness(parsed.v);
    }
    setDraft(null);
  }

  function handleApply(): void {
    if (draft !== null) {
      const parsed = hexToHsv(draft);
      setDraft(null);
      if (parsed) {
        setHue(parsed.h);
        setSaturation(parsed.s);
        setBrightness(parsed.v);
        onApply(hsvToHex(parsed.h, parsed.s, parsed.v));
        return;
      }
    }
    onApply(hex);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={squareReference}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuetext={hex}
        className="fly-swatch relative h-44 w-full cursor-crosshair touch-none rounded-md border-border"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromSquare(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.buttons > 0) updateFromSquare(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 10 : 2;
          if (event.key === "ArrowRight") { setSaturation((s) => Math.min(100, s + step)); setDraft(null); }
          else if (event.key === "ArrowLeft") { setSaturation((s) => Math.max(0, s - step)); setDraft(null); }
          else if (event.key === "ArrowUp") { setBrightness((v) => Math.min(100, v + step)); setDraft(null); }
          else if (event.key === "ArrowDown") { setBrightness((v) => Math.max(0, v - step)); setDraft(null); }
          else return;
          event.preventDefault();
        }}
      >
        <span
          aria-hidden="true"
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${saturation}%`, top: `${100 - brightness}%` }}
        />
      </div>
      <div
        ref={hueReference}
        role="slider"
        tabIndex={0}
        aria-label="Hue"
        aria-valuetext={`${Math.round(hue)} degrees`}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full"
        style={{
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateHue(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.buttons > 0) updateHue(event.clientX);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") setHue((h) => Math.min(360, h + 2));
          else if (event.key === "ArrowLeft") setHue((h) => Math.max(0, h - 2));
          else return;
          event.preventDefault();
          setDraft(null);
        }}
      >
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-transparent shadow"
          style={{ left: `${(hue / 360) * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-2">
        <TextInput
          id="spectrum-hex"
          labelText="Hex color"
          hideLabel
          size="sm"
          value={shownHex}
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = hexToHsv(event.target.value);
            onPreviewChange?.(parsed ? hsvToHex(parsed.h, parsed.s, parsed.v) : null);
          }}
          onBlur={commitDraft}
          onKeyDown={(event) => { if (event.key === "Enter") handleApply(); }}
          maxLength={7}
          className="font-mono uppercase"
        />
        <Button kind="primary" size="sm" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

function NewCurrentStrip({ current, preview }: {
  current?: string | null;
  preview?: string | null;
}) {
  return (
    <div className="fly-compare-strip flex items-center gap-3">
      <PreviewSwatch label="New" color={preview ?? current} />
      <PreviewSwatch label="Current" color={current} />
    </div>
  );
}

function PreviewSwatch({ label, color }: { label: string; color?: string | null }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="fly-swatch h-6 w-10 rounded border-border"
        style={{ backgroundColor: color ?? "transparent" }}
      />
      <span className="cds--type-label-01 text-muted-foreground">{label}</span>
    </span>
  );
}

function ColorPickerBody({ value, onSelect }: {
  value?: string | null;
  onSelect: (hex: string) => void;
}) {
  const [tab, setTab] = useState<"standard" | "custom">("standard");
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <ContentSwitcher
        size="sm"
        selectedIndex={tab === "standard" ? 0 : 1}
        onChange={(params) => setTab(params.index === 1 ? "custom" : "standard")}
      >
        <Switch name="standard" text="Standard" />
        <Switch name="custom" text="Custom" />
      </ContentSwitcher>
      {tab === "standard" ? (
        <HoneycombColorPicker
          value={value}
          onSelect={onSelect}
          onHover={setHovered}
          radius={7}
        />
      ) : (
        <SpectrumPicker initialHex={value} onApply={onSelect} onPreviewChange={setHovered} />
      )}
      <NewCurrentStrip current={value} preview={hovered} />
    </div>
  );
}

interface ColorPickerProperties {
  title: string;
  value?: string | null;
  onSelect: (hex: string) => void;
  children: React.ReactNode;
}

export function ColorPicker({ title, value, onSelect, children }: ColorPickerProperties) {
  // WHY: Controlled Carbon Popover that stays open while picking — colors
  // apply live on every click so users can audition shades. Closes via
  // outside click, Escape, or re-clicking the trigger. The trigger already
  // carries its own tooltip (IconButton label), so no wrapper is needed.
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-start" caret>
      <span onClick={() => setOpen((currently) => !currently)}>{children}</span>
      <PopoverContent className="fly-popover-panel-lg w-52">
        <p className="cds--type-label-02 fly-section-label text-muted-foreground">{title}</p>
        <ColorPickerBody value={value} onSelect={onSelect} />
      </PopoverContent>
    </Popover>
  );
}

interface ColorPickerDialogProperties {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  value?: string | null;
  onSelect: (hex: string) => void;
}

export function ColorPickerDialog({ open, onClose, title, description, value, onSelect }: ColorPickerDialogProperties) {
  // WHY: Picks apply live without closing (same audition behavior as the
  // popover) — close via ✕, Escape, or outside click. Passive: no footer.
  return (
    <Modal
      open={open}
      passiveModal
      size="sm"
      modalHeading={title}
      modalLabel={description}
      onRequestClose={onClose}
    >
      <ColorPickerBody value={value} onSelect={onSelect} />
    </Modal>
  );
}
