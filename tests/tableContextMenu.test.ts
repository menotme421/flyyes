import { describe, expect, it } from "vitest";
import { CELL_FILL_SWATCHES, eventTargetInTable } from "@/editor/TableContextMenu";

// WHY: The custom menu must open exactly on table right-clicks — anywhere else
// the native browser menu (spellcheck etc.) must survive untouched.
describe("eventTargetInTable", () => {
  it("detects clicks inside tables", () => {
    const fakeCell = { closest: (selector: string) => (selector === "table" ? {} : null) };
    expect(eventTargetInTable(fakeCell)).toBe(true);
  });

  it("ignores clicks outside tables", () => {
    const fakeParagraph = { closest: () => null };
    expect(eventTargetInTable(fakeParagraph)).toBe(false);
  });

  it("handles missing or broken targets safely", () => {
    expect(eventTargetInTable(null)).toBe(false);
    expect(eventTargetInTable(undefined)).toBe(false);
    expect(eventTargetInTable("cell")).toBe(false);
    expect(eventTargetInTable({})).toBe(false);
    expect(
      eventTargetInTable({ closest: () => { throw new Error("boom"); } })
    ).toBe(false);
  });

  it("ships a non-empty fill palette", () => {
    expect(CELL_FILL_SWATCHES.length).toBeGreaterThan(0);
  });
});
