import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw, round 3 — one full-width row ring with a DOWN
// chevron floating below it (arrow points where the new row goes, matching
// the column icons' convention). Solid shape, winding-independent.
export const SheetRowBelow = createCarbonIcon("sheet-row-below", [
  ["path",{d:"M28,12H4A2,2,0,0,1,2,10V4A2,2,0,0,1,4,2H28A2,2,0,0,1,30,4V10A2,2,0,0,1,28,12ZM4,4H28V10H4Z",fillRule:"evenodd",key:"ring"}],
  ["path",{d:"M16 26 21.586 20.414 20.172 19 16 23.172 11.828 19 10.414 20.414 16 26z",key:"chevdown"}]
]);
