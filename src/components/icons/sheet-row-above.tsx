import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw, round 2 — one full-width row ring (the current
// row) with ColumnInsert's up chevron floating above it (round 1 overlapped
// ring and chevron into one mass). Separation reads as direction at 16px.
export const SheetRowAbove = createCarbonIcon("sheet-row-above", [
  ["path",{d:"M28,30H4A2,2,0,0,1,2,28V22A2,2,0,0,1,4,20H28A2,2,0,0,1,30,22V28A2,2,0,0,1,28,30ZM4,20H28V28H4Z",fillRule:"evenodd",key:"ring"}],
  ["path",{d:"M16 13 21.586 7.414 20.172 6 16 10.172 11.828 6 10.414 7.414 16 13z",key:"chevup"}]
]);
