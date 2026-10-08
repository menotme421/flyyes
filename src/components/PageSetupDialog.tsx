import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Checkmark } from "@carbon/icons-react";
import { ContentSwitcher, Modal, Switch } from "@carbon/react";
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

  // WHY: Portaled to document.body (and mounted only while open) — this
  // dialog lives inside the sticky ribbon, whose stacking context would
  // otherwise trap the fixed overlay below the title row (top visibly cut
  // off). Same treatment as the color UrlDialogs.
  if (!open) return null;
  return createPortal(
    <Modal
      open={open}
      size="md"
      hasScrollingContent
      modalHeading="Page setup"
      modalLabel="Saved per document · applies to edit, preview, print, and Word export"
      primaryButtonText="Apply"
      secondaryButtonText="Cancel"
      onRequestSubmit={() => {
        onSave(selectedMargin.id, orientation);
        onClose();
      }}
      onSecondarySubmit={onClose}
      onRequestClose={onClose}
    >

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
                  "fly-paper-tab text-base transition-colors",
                  isActive
                    ? "is-active font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1.15fr]">
          {/* Left: controls */}
          <div className="flex min-w-0 flex-col gap-4">
            <section aria-label="Orientation">
              <h3 className="cds--type-label-01 fly-section-label text-muted-foreground">Orientation</h3>
              <ContentSwitcher
                size="sm"
                selectedIndex={orientation === "portrait" ? 0 : 1}
                onChange={(params) => setOrientation(params.index === 1 ? "landscape" : "portrait")}
              >
                <Switch name="portrait" text="Portrait" />
                <Switch name="landscape" text="Landscape" />
              </ContentSwitcher>
            </section>

            <section aria-label="Margins">
              <h3 className="cds--type-label-01 fly-section-label text-muted-foreground">Margins</h3>
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
                        "fly-margin-row flex items-center gap-3 rounded-md text-left transition-colors",
                        isSelected
                          ? "border-primary bg-accent"
                          : "border-border hover:border-input hover:bg-muted/50"
                      )}
                    >
                      <MarginThumb preset={preset} />
                      <span className="min-w-0 flex-1">
                        <span className="cds--type-body-compact-02 flex items-center gap-1.5">
                          {preset.name}
                          {isSelected ? <Checkmark className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                        </span>
                        <span className="cds--type-body-compact-01 block truncate text-muted-foreground" title={preset.useCases.join(" · ")}>
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
              <h3 className="cds--type-label-01 fly-section-label text-muted-foreground">Preview</h3>
          {/* WHY: Width-capped (not height-capped) so the aspect ratio can
              never distort — height follows from width. 200px keeps the whole
              dialog, footer included, above the fold on short viewports. */}
            <div className="fly-preview-box rounded-md bg-muted/40">
              <PreviewSheet
                widthMm={orientation === "landscape" ? previewPreset.heightMm : previewPreset.widthMm}
                heightMm={orientation === "landscape" ? previewPreset.widthMm : previewPreset.heightMm}
                margins={previewPreset.margins}
              />
              <p className="cds--type-label-01 fly-caption text-center text-muted-foreground">
                {previewPreset.widthMm} × {previewPreset.heightMm} mm ·{" "}
                {orientation === "landscape" ? "Landscape" : "Portrait"}
              </p>
              <p className="cds--type-label-01 text-center text-muted-foreground">{describeMargins(previewPreset.margins)}</p>
            </div>
          </section>
        </div>
    </Modal>,
    document.body
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
      className="fly-swatch relative shrink-0 rounded-[2px] border-border bg-white"
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
      className="fly-preview-sheet relative block w-full max-w-[200px] bg-white shadow-sm"
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
