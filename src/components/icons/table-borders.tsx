import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw — plain bordered box (BorderFull's inner text
// lines read as paragraph text inside a table toggle). Active state carries
// the on/off meaning; the glyph just says "borders". Corner spans are all
// 2x2 like the validated row rings (a 2x4 span silently bulges the arc).
export const TableBordersIcon = createCarbonIcon("table-borders", [
  ["path",{d:"M28,28H6A2,2,0,0,1,4,26V6A2,2,0,0,1,6,4H28A2,2,0,0,1,30,6V26A2,2,0,0,1,28,28ZM6,6H28V26H6Z",fillRule:"evenodd",key:"frame"}]
]);
