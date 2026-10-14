import { useEditorState, type Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button, Checkbox, Input, Label } from "@flyyes/ui";
import { ToolButton } from "@/editor/ToolButton";

// WHY: Own file (single responsibility) — search state lives in the
// FindAndReplace extension, this panel is only the controls. Docks top-right
// over the page canvas like Word; Esc closes and clears highlights so exports
// and print never carry search marks (they are decorations, but clean anyway).

interface SearchPanelProperties {
  editor: Editor;
  open: boolean;
  onClose: () => void;
}

export function SearchPanel({ editor, open, onClose }: SearchPanelProperties) {
  // WHY: Reactive read of extension storage — count updates as the user types
  // (debounced 250ms inside the extension) without manual subscriptions.
  // Fallbacks keep the panel alive (showing "No matches") even if the
  // extension ever fails to register — never crash the whole editor tree.
  const { resultsCount, currentNumber, caseSensitive, wholeWord } = useEditorState({
    editor,
    selector: (snapshot) => {
      const storage = snapshot.editor?.storage.findAndReplace as
        | {
            results: unknown[];
            currentIndex: number | null;
            caseSensitive: boolean;
            wholeWord: boolean;
          }
        | undefined;
      return {
        resultsCount: storage?.results.length ?? 0,
        currentNumber: storage?.currentIndex == null ? 0 : storage.currentIndex + 1,
        caseSensitive: storage?.caseSensitive ?? false,
        wholeWord: storage?.wholeWord ?? false,
      };
    },
  });

  // WHY: Panel mounts fresh on each open, so autoFocus lands the cursor
  // without ref plumbing (the copy-owned Input doesn't forward refs).
  if (!open) return null;

  // WHY: Same degraded-mode guard as the selector above — if the extension
  // didn't register, disable the controls instead of throwing on first keystroke.
  const searchReady = typeof (editor.commands as Record<string, unknown>).setSearchTerm === "function";

  return (
    <div
      role="search"
      aria-label="Find and replace"
      className="fly-search-panel no-print absolute right-4 top-2 z-20 w-72 rounded-md bg-background shadow-lg"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          handleClose();
        }
        // WHY: Stop everything while typing — window-level shortcuts must
        // not fire mid-search term.
        event.stopPropagation();
      }}
    >
      <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs">Find and replace</span>
        <ToolButton title="Close search" onClick={handleClose}>
          <X size={16} />
        </ToolButton>
      </div>

      <div className="flex items-center gap-1">
        <Label htmlFor="find-input" className="sr-only">
          Find
        </Label>
        <Input
          id="find-input"
          autoFocus
          placeholder="Find…"
          disabled={!searchReady}
          onChange={(event) => editor.commands.setSearchTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              editor.commands.goToNextResult();
            }
          }}
        />
        <ToolButton
          title="Previous match"
          disabled={!searchReady}
          onClick={() => editor.commands.goToPreviousResult()}
        >
          <ChevronUp size={16} />
        </ToolButton>
        <ToolButton
          title="Next match"
          disabled={!searchReady}
          onClick={() => editor.commands.goToNextResult()}
        >
          <ChevronDown size={16} />
        </ToolButton>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {resultsCount === 0 ? "No matches" : `${currentNumber} of ${resultsCount}`}
      </p>

      <Label htmlFor="replace-input" className="sr-only">
        Replace with
      </Label>
      <Input
        id="replace-input"
        placeholder="Replace with…"
        disabled={!searchReady}
        onChange={(event) => editor.commands.setReplaceTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            editor.commands.replace();
          }
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={!searchReady}
          onClick={() => editor.commands.replace()}
        >
          Replace
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={!searchReady}
          onClick={() => editor.commands.replaceAll()}
        >
          Replace all
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2">
          <Checkbox
            id="match-case"
            checked={caseSensitive}
            disabled={!searchReady}
            onCheckedChange={(checked) => editor.commands.setCaseSensitive(checked === true)}
          />
          <Label htmlFor="match-case">Match case</Label>
        </span>
        <span className="flex items-center gap-2">
          <Checkbox
            id="whole-word"
            checked={wholeWord}
            disabled={!searchReady}
            onCheckedChange={(checked) => editor.commands.setWholeWord(checked === true)}
          />
          <Label htmlFor="whole-word">Whole word</Label>
        </span>
      </div>
      </div>
    </div>
  );

  function handleClose(): void {
    editor.commands.clearSearch();
    onClose();
  }
}
