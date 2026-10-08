import { useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { DocumentConfiguration } from "@carbon/icons-react";
import { IconButton } from "@carbon/react";
import { PageSetupDialog } from "@/components/PageSetupDialog";
import { ZoomSelect } from "@/components/ZoomSelect";
import type { ResolvedPageSetup } from "@/services/pageSetupService";
import type { PageOrientation } from "@/storage/documentTypes";

// WHY: Own file — Word's bottom bar (live words + saved status + view
// controls). Zoom and page setup moved here from the ribbon (Docs/Word
// convention keeps view controls out of formatting): they are document-level,
// so they belong with stats, not styles. Reads the CharacterCount extension
// storage already registered in the editor, so no new counting logic and no
// extra renders beyond selection/content changes.

interface StatusBarProperties {
  editor: Editor;
  savedLabel: string;
  zoomPercent: number;
  onZoomChange: (nextZoom: number) => void;
  pageSetup: ResolvedPageSetup;
  onPageSetupChange: (presetId: string, orientation: PageOrientation) => void;
}

export function StatusBar({
  editor,
  savedLabel,
  zoomPercent,
  onZoomChange,
  pageSetup,
  onPageSetupChange,
}: StatusBarProperties) {
  // WHY: Fallbacks (0 words) if the counter extension ever fails to
  // register — a missing status number must never crash the editor tree.
  const { words, characters } = useEditorState({
    editor,
    selector: (snapshot) => {
      const storage = snapshot.editor?.storage.characterCount as
        | {
            words: () => number;
            characters: () => number;
          }
        | undefined;
      return { words: storage?.words() ?? 0, characters: storage?.characters() ?? 0 };
    },
  });
  // WHY: Dialog state lives with its opener (single source of truth), same
  // as it did in the toolbar — only the address changed.
  const [pageSetupOpen, setPageSetupOpen] = useState(false);

  return (
    <div
      aria-label="Document statistics"
      className="cds--type-body-compact-01 fly-statusbar no-print flex flex-wrap items-center justify-between bg-background text-muted-foreground"
    >
      <span>
        {words} words · {characters} characters
      </span>
      <span className="hidden sm:inline">{savedLabel}</span>
      <span className="flex items-center gap-0">
        <IconButton
          kind="ghost"
          size="sm"
          label="Page setup (paper presets)"
          align="top"
          autoAlign
          onClick={() => setPageSetupOpen(true)}
        >
          <DocumentConfiguration />
        </IconButton>
        <PageSetupDialog
          open={pageSetupOpen}
          onClose={() => setPageSetupOpen(false)}
          initialPresetId={pageSetup.presetId}
          initialOrientation={pageSetup.landscape ? "landscape" : "portrait"}
          onSave={onPageSetupChange}
        />
        <div className="w-28 shrink-0">
          <ZoomSelect zoomPercent={zoomPercent} onZoomChange={onZoomChange} />
        </div>
      </span>
    </div>
  );
}
