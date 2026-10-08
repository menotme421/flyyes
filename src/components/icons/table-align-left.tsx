import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw — mini 2x2 table grid pinned left (table
// alignment, not text alignment: the reused TextAlign glyphs read as
// paragraph tools). All corners sweep 1 like Carbon's own rings; evenodd
// keeps cutouts correct regardless of winding.
export const TableAlignLeftIcon = createCarbonIcon("table-align-left", [
  ["path",{d:"M16,22H6A2,2,0,0,1,4,20V12A2,2,0,0,1,6,10H16A2,2,0,0,1,18,12V20A2,2,0,0,1,16,22ZM6,12H16V20H6Z",fillRule:"evenodd",key:"grid"}],
  ["rect",{x:"10",y:"12",width:"2",height:"8",key:"vdiv"}],
  ["rect",{x:"6",y:"15",width:"10",height:"2",key:"hdiv"}]
]);
