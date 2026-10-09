import { Extension, type Editor } from "@tiptap/core";

// WHY: Word-style paragraph indent as a tiny owned extension (no new dependency).
// One step = 36px (≈0.5in at screen scale, matching DOCX export's 720 twip).
// Stored as data-indent + inline margin so HTML/preview/DOCX all see it.

export const INDENT_STEP_PX = 36;
export const MAX_INDENT_LEVEL = 7;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    flyyesIndent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

function clampLevel(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(MAX_INDENT_LEVEL, Math.max(0, Math.round(parsed)));
}

export const FlyyesIndent = Extension.create({
  name: "flyyesIndent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => clampLevel(element.getAttribute("data-indent")),
            renderHTML: (attributes) => {
              const level = clampLevel(attributes.indent);
              if (level === 0) return {};
              return {
                "data-indent": String(level),
                style: `margin-left: ${level * INDENT_STEP_PX}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const shiftIndent = (delta: 1 | -1) => () => ({ editor }: { editor: Editor }) => {
      const current = clampLevel(
        editor.getAttributes("paragraph").indent ??
          editor.getAttributes("heading").indent ??
          0
      );
      const next = clampLevel(current + delta);
      if (next === current) return false;
      // Apply to both types; the one outside the selection is a harmless no-op.
      return editor
        .chain()
        .updateAttributes("paragraph", { indent: next })
        .updateAttributes("heading", { indent: next })
        .run();
    };
    return {
      increaseIndent: shiftIndent(1),
      decreaseIndent: shiftIndent(-1),
    };
  },
});
