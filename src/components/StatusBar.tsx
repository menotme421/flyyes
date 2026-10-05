import { useEditorState, type Editor } from "@tiptap/react";

// WHY: Own file — Word's bottom bar (live words + saved status). Reads the
// CharacterCount extension storage already registered in the editor, so no new
// counting logic and no extra renders beyond selection/content changes.

interface StatusBarProperties {
  editor: Editor;
  savedLabel: string;
}

export function StatusBar({ editor, savedLabel }: StatusBarProperties) {
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

  return (
    <div
      aria-label="Document statistics"
      className="no-print flex items-center justify-between border-t border-border bg-background px-4 py-1 text-xs text-muted-foreground"
    >
      <span>
        {words} words · {characters} characters
      </span>
      <span className="hidden sm:inline">{savedLabel}</span>
    </div>
  );
}
