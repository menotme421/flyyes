import { createCarbonIcon } from "./iconFactory";

// WHY: Carbon 32-grid redraw — TableSplit's outer ring with an inward chevron
// pair (merge), reusing RowInsert's chevron halves. Same export name/API
// (the Icon suffix avoids a name collision, as before).
export const TableCellsMergeIcon = createCarbonIcon("table-cells-merge", [
  ["path",{d:"M27,3H5A2,2,0,0,0,3,5V27a2,2,0,0,0,2,2H27a2,2,0,0,0,2-2V5A2,2,0,0,0,27,3ZM5,5H27V27H5Z",fillRule:"evenodd",key:"frame"}],
  ["path",{d:"M9 16 14.586 10.414 16 11.828 11.828 16 16 20.172 14.586 21.586 9 16z",key:"chevinleft"}],
  ["path",{d:"M23 16 17.414 10.414 16 11.828 20.172 16 16 20.172 17.414 21.586 23 16z",key:"chevinright"}]
]);
