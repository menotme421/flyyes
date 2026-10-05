import { useEffect, useState } from "react";
import { Check, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PAGE_PRESETS, findPreset, type PaperPreset } from "@/services/pageSetupService";
import type { PageOrientation } from "@/storage/documentTypes";
import { mergeClassNames } from "@/lib/utils";

// WHY: Two-column page setup — controls left, live preview right. Paper tabs
// stay full-width on top; orientation is orthogonal (any paper goes
// landscape), so margin presets are small rows and the single preview frame
// rotates for real. One Apply saves paper + orientation + margins together.
// No manual inputs: fixed presets only.

interface PageSetupDialogProperties {
  open: boolean;
  onClose: () => void;
  initialPresetId: string;
  initialOrientation: PageOrientation;
  onSave: (presetId: string, orientation: PageOrientation) => void;
}

export function PageSetupDialog({
  open,
  onClose,
  initialPresetId,
  initialOrientation,
  onSave,
}: PageSetupDialogProperties) {
  const [activeTab, setActiveTab] = useState<string>(() => tabOf(initialPresetId));
  const [orientation, setOrientation] = useState<PageOrientation>(initialOrientation);
  const [selectedMarginId, setSelectedMarginId] = useState<string>(initialPresetId);

  // WHY: Re-seed everything each time it opens so cancelled picks never linger.
  useEffect(() => {
    if (open) {
      setActiveTab(tabOf(initialPresetId));
      setOrientation(initialOrientation);
      setSelectedMarginId(initialPresetId);
    }
  }, [open, initialPresetId, initialOrientation]);

  const groups = groupByPaper(PAGE_PRESETS);
  const activeGroup = groups.find((group) => shortPaperLabel(group.paperLabel) === activeTab) ?? groups[0];
  // WHY: Margin rows follow the active paper tab. If the previous pick has no
  // equivalent on this paper (only A4 has three), fall back to its Standard.
  const visibleMargins = activeGroup.presets;
  const selectedMargin =
    visibleMargins.find((preset) => preset.id === selectedMarginId) ?? visibleMargins[0];
  const previewPreset = selectedMargin;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const nextGroup = groups.find((group) => shortPaperLabel(group.paperLabel) === tab);
    if (nextGroup && !nextGroup.presets.some((preset) => preset.id === selectedMarginId)) {
      setSelectedMarginId(nextGroup.presets[0].id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Page Setup</DialogTitle>
          <DialogDescription>Saved per document · applies to edit, preview, print, and Word export</DialogDescription>
        </DialogHeader>

        {/* Paper tabs */}
        <div role="tablist" aria-label="Paper size" className="flex items-center gap-5">
          {groups.map((group) => {
            const tab = shortPaperLabel(group.paperLabel);
            const isActive = shortPaperLabel(activeGroup.paperLabel) === tab;
            return (
              <button
                key={group.paperLabel}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab)}
                className={mergeClassNames(
                  "-mb-px border-b-2 pb-1.5 text-base transition-colors",
                  isActive
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1.15fr]">
          {/* Left: controls */}
          <div className="flex min-w-0 flex-col gap-5">
            <section aria-label="Orientation">
              <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Orientation</h3>
              <ToggleGroup
                type="single"
                value={orientation}
                onValueChange={(value) => {
                  if (value === "portrait" || value === "landscape") setOrientation(value);
                }}
                aria-label="Page orientation"
                className="grid grid-cols-2 gap-1.5"
              >
                <ToggleGroupItem value="portrait" aria-label="Portrait" className="gap-1.5">
                  <RectangleVertical className="h-4 w-4" aria-hidden /> Portrait
                </ToggleGroupItem>
                <ToggleGroupItem value="landscape" aria-label="Landscape" className="gap-1.5">
                  <RectangleHorizontal className="h-4 w-4" aria-hidden /> Landscape
                </ToggleGroupItem>
              </ToggleGroup>
            </section>

            <section aria-label="Margins">
              <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Margins</h3>
              <div role="radiogroup" aria-label={`${activeGroup.paperLabel} margin presets`} className="flex flex-col gap-1.5">
                {visibleMargins.map((preset) => {
                  const isSelected = preset.id === selectedMargin.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedMarginId(preset.id)}
                      className={mergeClassNames(
                        "flex items-center gap-3 rounded-md border p-2 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-accent"
                          : "border-border hover:border-input hover:bg-muted/50"
                      )}
                    >
                      <MarginThumb preset={preset} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {preset.name}
                          {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground" title={preset.useCases.join(" · ")}>
                          {preset.useCases.join(" · ")}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right: live preview */}
          <section aria-label="Preview" className="min-w-0 order-first md:order-none">
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Preview</h3>
            {/* WHY: Width-capped (not height-capped) so the aspect ratio can
                never distort — height follows from width. 240px keeps the
                whole dialog, footer included, above the fold. */}
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <PreviewSheet
                widthMm={orientation === "landscape" ? previewPreset.heightMm : previewPreset.widthMm}
                heightMm={orientation === "landscape" ? previewPreset.widthMm : previewPreset.heightMm}
                margins={previewPreset.margins}
              />
              <p className="mt-1.5 text-center text-xs text-muted-foreground">
                {previewPreset.widthMm} × {previewPreset.heightMm} mm ·{" "}
                {orientation === "landscape" ? "Landscape" : "Portrait"}
              </p>
              <p className="text-center text-xs text-muted-foreground">{describeMargins(previewPreset.margins)}</p>
            </div>
          </section>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={() => {
              onSave(selectedMargin.id, orientation);
              onClose();
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small margin thumbnail for the margin rows (true ratio, to scale). */
function MarginThumb({ preset }: { preset: PaperPreset }) {
  const boxWidth = 30;
  const boxHeight = Math.max(16, Math.round((boxWidth * preset.heightMm) / preset.widthMm));
  const toPct = (cm: number, totalMm: number) => `${Math.min(45, (cm * 10 * 100) / totalMm)}%`;
  return (
    <span
      aria-hidden
      className="relative shrink-0 rounded-[2px] border border-border bg-white"
      style={{ width: boxWidth, height: boxHeight }}
    >
      <span
        className="absolute rounded-[1px] bg-muted"
        style={{
          left: toPct(preset.margins.leftCm, preset.widthMm),
          right: toPct(preset.margins.rightCm, preset.widthMm),
          top: toPct(preset.margins.topCm, preset.heightMm),
          bottom: toPct(preset.margins.bottomCm, preset.heightMm),
        }}
      />
    </span>
  );
}

/** Large live preview sheet: true ratio for the current paper + orientation. */
function PreviewSheet({
  widthMm,
  heightMm,
  margins,
}: {
  widthMm: number;
  heightMm: number;
  margins: PaperPreset["margins"];
}) {
  const toPct = (cm: number, totalMm: number) => `${Math.min(45, (cm * 10 * 100) / totalMm)}%`;
  return (
    <span
      aria-hidden
      className="relative mx-auto block w-full max-w-[240px] bg-white shadow-sm"
      style={{ aspectRatio: `${widthMm} / ${heightMm}` }}
    >
      <span
        className="absolute bg-muted"
        style={{
          left: toPct(margins.leftCm, widthMm),
          right: toPct(margins.rightCm, widthMm),
          top: toPct(margins.topCm, heightMm),
          bottom: toPct(margins.bottomCm, heightMm),
        }}
      />
    </span>
  );
}

function describeMargins(margins: PaperPreset["margins"]): string {
  const { topCm, rightCm, bottomCm, leftCm } = margins;
  if (topCm === rightCm && rightCm === bottomCm && bottomCm === leftCm) {
    return `Margins ${topCm} cm all sides`;
  }
  return `Margins T ${topCm} · R ${rightCm} · B ${bottomCm} · L ${leftCm} cm`;
}

function shortPaperLabel(paperLabel: string): string {
  return paperLabel.split("·")[0]?.trim() || paperLabel;
}

function tabOf(presetId: string): string {
  const preset = findPreset(presetId);
  return preset ? shortPaperLabel(preset.paperLabel) : shortPaperLabel(PAGE_PRESETS[0].paperLabel);
}

function groupByPaper(presets: readonly PaperPreset[]): Array<{ paperLabel: string; presets: PaperPreset[] }> {
  const groups: Array<{ paperLabel: string; presets: PaperPreset[] }> = [];
  for (const preset of presets) {
    const existing = groups.find((group) => group.paperLabel === preset.paperLabel);
    if (existing) {
      existing.presets.push(preset);
    } else {
      groups.push({ paperLabel: preset.paperLabel, presets: [preset] });
    }
  }
  return groups;
}
