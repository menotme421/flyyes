import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw, round 2 — one full-height column ring (the
// current column) with RowInsert's left chevron floating left of it (round 1
// overlapped ring and chevron, erasing the direction cue entirely).
export const SheetColumnLeft = createCarbonIcon("sheet-column-left", [
  ["path",{d:"M28,30H22A2,2,0,0,1,20,28V4A2,2,0,0,1,22,2H28A2,2,0,0,1,30,4V28A2,2,0,0,1,28,30ZM22,4H28V28H22Z",fillRule:"evenodd",key:"ring"}],
  ["path",{d:"M12 16 6.414 10.414 5 11.828 9.172 16 5 20.172 6.414 21.586 12 16z",key:"chevleft"}]
]);
