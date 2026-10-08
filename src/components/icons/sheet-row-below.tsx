import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw, round 2 — one full-width row ring with a down
// chevron floating below it (up chevron mirrored about y=16; solid shape so
// the winding flip is harmless). Separation reads as direction at 16px.
export const SheetRowBelow = createCarbonIcon("sheet-row-below", [
  ["path",{d:"M28,12H4A2,2,0,0,1,2,10V4A2,2,0,0,1,4,2H28A2,2,0,0,1,30,4V10A2,2,0,0,1,28,12ZM4,4H28V10H4Z",fillRule:"evenodd",key:"ring"}],
  ["path",{d:"M16 19 21.586 24.586 20.172 26 16 21.828 11.828 26 10.414 24.586 16 19z",key:"chevdown"}]
]);
