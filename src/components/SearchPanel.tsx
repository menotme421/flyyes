import { useEditorState, type Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      className="no-print absolute right-4 top-2 z-20 w-72 rounded-md border border-border bg-background p-3 shadow-lg"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          handleClose();
        }
        event.stopPropagation();
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">Find and replace</span>
        <Button variant="ghost" size="icon" aria-label="Close search" className="h-6 w-6" onClick={handleClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Input
          autoFocus
          placeholder="Find…"
          aria-label="Find"
          className="h-8 text-xs"
          disabled={!searchReady}
          onChange={(event) => editor.commands.setSearchTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              editor.commands.goToNextResult();
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous match"
          className="h-8 w-8 shrink-0"
          disabled={!searchReady}
          onClick={() => editor.commands.goToPreviousResult()}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next match"
          className="h-8 w-8 shrink-0"
          disabled={!searchReady}
          onClick={() => editor.commands.goToNextResult()}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
        {resultsCount === 0 ? "No matches" : `${currentNumber} of ${resultsCount}`}
      </p>

      <Input
        placeholder="Replace with…"
        aria-label="Replace with"
        className="mt-2 h-8 text-xs"
        disabled={!searchReady}
        onChange={(event) => editor.commands.setReplaceTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            editor.commands.replace();
          }
        }}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
          disabled={!searchReady}
          onClick={() => editor.commands.replace()}
        >
          Replace
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
          disabled={!searchReady}
          onClick={() => editor.commands.replaceAll()}
        >
          Replace all
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            checked={caseSensitive}
            disabled={!searchReady}
            onChange={(event) => editor.commands.setCaseSensitive(event.target.checked)}
            className="h-3.5 w-3.5 accent-current"
          />
          Match case
        </label>
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            checked={wholeWord}
            disabled={!searchReady}
            onChange={(event) => editor.commands.setWholeWord(event.target.checked)}
            className="h-3.5 w-3.5 accent-current"
          />
          Whole word
        </label>
      </div>
    </div>
  );

  function handleClose(): void {
    editor.commands.clearSearch();
    onClose();
  }
}
