import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw — TableSplit's grid verbatim (Carbon's own
// split-table glyph, proven geometry, zero invention risk). Same export
// name/API (the Icon suffix avoids a name collision, as before).
export const TableCellsSplitIcon = createCarbonIcon("table-cells-split", [
  ["path",{d:"M27,3H5A2,2,0,0,0,3,5V27a2,2,0,0,0,2,2H27a2,2,0,0,0,2-2V5A2,2,0,0,0,27,3Zm0,2V9H5V5ZM17,11H27v7H17Zm-2,7H5V11H15ZM5,20H15v7H5Zm12,7V20H27v7Z",key:"splitgrid"}]
]);
