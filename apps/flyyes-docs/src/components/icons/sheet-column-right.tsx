import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw, round 2 — one full-height column ring with a
// right chevron floating right of it (left chevron mirrored about x=16;
// solid shape so the winding flip is harmless).
export const SheetColumnRight = createCarbonIcon("sheet-column-right", [
  ["path",{d:"M10,30H4A2,2,0,0,1,2,28V4A2,2,0,0,1,4,2H10A2,2,0,0,1,12,4V28A2,2,0,0,1,10,30ZM4,4H10V28H4Z",fillRule:"evenodd",key:"ring"}],
  ["path",{d:"M20 16 25.586 10.414 27 11.828 22.828 16 27 20.172 25.586 21.586 20 16z",key:"chevright"}]
]);
