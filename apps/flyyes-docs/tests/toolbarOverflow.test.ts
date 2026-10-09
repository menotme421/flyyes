import { describe, expect, it } from "vitest";
import { nextCollapseId } from "@/editor/toolbarOverflow";

// WHY: Responsive collapse must be predictable — lowest priority first,
// destructive tools last, stable when nothing is left to hide. Pin the order
// here so a priority typo fails loudly instead of hiding Delete row early.
const GROUPS = [
  { id: "align", priority: 10 },
  { id: "headers", priority: 20 },
  { id: "rows", priority: 50 },
];

describe("nextCollapseId", () => {
  it("collapses the lowest priority group first", () => {
    expect(nextCollapseId(GROUPS, [])).toBe("align");
  });

  it("walks up the priority ladder as groups hide", () => {
    expect(nextCollapseId(GROUPS, ["align"])).toBe("headers");
    expect(nextCollapseId(GROUPS, ["align", "headers"])).toBe("rows");
  });

  it("returns null when everything collapsible is hidden", () => {
    expect(nextCollapseId(GROUPS, ["align", "headers", "rows"])).toBeNull();
  });

  it("returns null with no collapsible groups", () => {
    expect(nextCollapseId([], [])).toBeNull();
  });

  it("ignores unknown hidden ids", () => {
    expect(nextCollapseId(GROUPS, ["nope"])).toBe("align");
  });
});
