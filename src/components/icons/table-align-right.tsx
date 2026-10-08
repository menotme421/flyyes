import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw — mini 2x2 table grid pinned right (see
// table-align-left for the construction notes).
export const TableAlignRightIcon = createCarbonIcon("table-align-right", [
  ["path",{d:"M28,22H18A2,2,0,0,1,16,20V12A2,2,0,0,1,18,10H28A2,2,0,0,1,30,12V20A2,2,0,0,1,28,22ZM18,12H28V20H18Z",fillRule:"evenodd",key:"grid"}],
  ["rect",{x:"22",y:"12",width:"2",height:"8",key:"vdiv"}],
  ["rect",{x:"18",y:"15",width:"10",height:"2",key:"hdiv"}]
]);
