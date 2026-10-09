import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw, round 3 — one full-width row ring (current
// row) with an UP chevron floating above it: the arrow points where the new
// row goes. (Round 2 reused Carbon's insertion-direction chevron, which
// points at the boxes — backwards for above/below. Columns already pointed
// at the destination, so all four now share one convention.)
export const SheetRowAbove = createCarbonIcon("sheet-row-above", [
  ["path",{d:"M28,30H4A2,2,0,0,1,2,28V22A2,2,0,0,1,4,20H28A2,2,0,0,1,30,22V28A2,2,0,0,1,28,30ZM4,22H28V28H4Z",fillRule:"evenodd",key:"ring"}],
  ["path",{d:"M16 6 21.586 11.586 20.172 13 16 8.828 11.828 13 10.414 11.586 16 6z",key:"chevup"}]
]);
