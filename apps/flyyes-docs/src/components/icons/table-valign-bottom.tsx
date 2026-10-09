import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw — cell frame with text lines pinned bottom (see
// table-valign-top for the construction notes).
export const TableValignBottomIcon = createCarbonIcon("table-valign-bottom", [
  ["path",{d:"M28,28H6A2,2,0,0,1,4,26V6A2,2,0,0,1,6,4H28A2,2,0,0,1,30,6V26A2,2,0,0,1,28,28ZM6,6H28V26H6Z",fillRule:"evenodd",key:"frame"}],
  ["rect",{x:"8",y:"19",width:"16",height:"2",key:"line1"}],
  ["rect",{x:"8",y:"23",width:"16",height:"2",key:"line2"}]
]);
