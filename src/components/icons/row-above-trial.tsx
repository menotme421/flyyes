import { createSvgIcon } from "./iconFactory";

// WHY: Trial glyph (lucide-studio "between-horizontal-end") for the Row-above
// button — coordinates rescaled x0.75 into the 24 grid (studio export
// overflowed to 30.5 and would clip) and adapted to the local zero-dependency
// factory. Wired as a trial only; revert to SheetRowAbove if rejected.
export const RowAboveTrialIcon = createSvgIcon("row-above-trial", [
  ["path",{d:"M12.38 15h-9",key:"z2cpkf"}],
  ["path",{d:"M13.88 8.25V6.75",key:"78wnfu"}],
  ["path",{d:"M13.88 9.75h-12",key:"yvkgud"}],
  ["path",{d:"M13.88 12.75v4.5",key:"spp7c3"}],
  ["path",{d:"M13.88 15.75v-1.5",key:"14vnls"}],
  ["path",{d:"M13.88 17.25h-12",key:"19i3qy"}],
  ["path",{d:"M13.88 5.25v4.5",key:"1nregk"}],
  ["path",{d:"M1.88 9.75V5.25",key:"1jxq2z"}],
  ["path",{d:"M1.88 12.75h12",key:"up97sn"}],
  ["path",{d:"M1.88 17.25v-4.5",key:"mf1nyq"}],
  ["path",{d:"M1.88 5.25h12",key:"10lb2h"}],
  ["path",{d:"M16.88 11.25h2.25",key:"1lidza"}],
  ["path",{d:"M19.13 11.25v6",key:"1g0gqt"}],
  ["path",{d:"M19.13 17.25h1.5",key:"1bmnac"}],
  ["path",{d:"m19.88 8.63-3 3",key:"1qcu92"}],
  ["path",{d:"M20.63 11.25h2.25",key:"1qc5k5"}],
  ["path",{d:"M20.63 17.25v-6",key:"obgfmz"}],
  ["path",{d:"m22.88 11.25-3-3",key:"13ua4u"}],
  ["path",{d:"M3.38 7.5h9",key:"152gyi"}]
]);
