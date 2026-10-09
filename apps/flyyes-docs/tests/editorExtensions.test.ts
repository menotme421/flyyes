import { describe, expect, it } from "vitest";
import { flattenExtensions } from "@tiptap/core";
import { createWordExtensions } from "@/editor/editorExtensions";

// WHY: Duplicate extension names only warn at runtime ("can lead to issues")
// and silently break storage/commands — this test fails the build instead.
// DOM-free: flattening only resolves configs, never touches the document.

function flattenedNames(): string[] {
  return flattenExtensions(createWordExtensions()).map((extension) => extension.name);
}

describe("editorExtensions", () => {
  it("registers every extension exactly once", () => {
    const names = flattenedNames();
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    expect(duplicates).toEqual([]);
  });

  it("includes find-and-replace and task list support", () => {
    const names = flattenedNames();
    expect(names).toContain("findAndReplace");
    expect(names).toContain("taskList");
    expect(names).toContain("taskItem");
  });
});
