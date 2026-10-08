import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw — mini 2x2 table grid centered (see
// table-align-left for the construction notes).
export const TableAlignCenterIcon = createCarbonIcon("table-align-center", [
  ["path",{d:"M22,22H12A2,2,0,0,1,10,20V12A2,2,0,0,1,12,10H22A2,2,0,0,1,24,12V20A2,2,0,0,1,22,22ZM12,12H22V20H12Z",fillRule:"evenodd",key:"grid"}],
  ["rect",{x:"16",y:"12",width:"2",height:"8",key:"vdiv"}],
  ["rect",{x:"12",y:"15",width:"10",height:"2",key:"hdiv"}]
]);
