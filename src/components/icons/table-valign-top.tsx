import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw — cell frame with two text lines pinned top
// (cell vertical alignment; the TextAlign paragraph glyphs meant something
// else). Frame reuses the validated borders geometry; line pairs sit at
// y8-14 (top), y14-20 (middle), y19-25 (bottom) across the three icons.
export const TableValignTopIcon = createCarbonIcon("table-valign-top", [
  ["path",{d:"M28,28H6A2,2,0,0,1,4,26V6A2,2,0,0,1,6,4H28A2,2,0,0,1,30,6V26A2,2,0,0,1,28,28ZM6,6H28V26H6Z",fillRule:"evenodd",key:"frame"}],
  ["rect",{x:"8",y:"8",width:"16",height:"2",key:"line1"}],
  ["rect",{x:"8",y:"12",width:"16",height:"2",key:"line2"}]
]);
