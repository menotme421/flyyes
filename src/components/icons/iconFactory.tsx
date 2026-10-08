import type { SVGProps } from "react";

// WHY: Local replacement for lucide's createLucideIcon — same 24px stroke
// icons, zero dependency (lucide-react is removed). Each icon file keeps its
// path data untouched; only the factory import changed.

type IconNode = Array<[string, Record<string, string>]>;

interface SvgIconProperties extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

// WHY: Carbon-style companion to createSvgIcon — 32-grid filled geometry
// (fill currentColor, no stroke, default 16) matching @carbon/icons-react
// exactly, for glyphs Carbon never drew (directional table inserts). Native
// fill needs no inline-style pins: the ghost-button fill rule resolves to
// the same icon token these icons want.
export function createCarbonIcon(displayName: string, nodes: IconNode) {
  function CarbonIcon({ size = 16, ...rest }: SvgIconProperties) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="currentColor"
        {...rest}
      >
        {nodes.map(([tag, attrs]) => {
          const { key, ...properties } = attrs;
          if (tag === "rect") return <rect key={key} {...properties} />;
          if (tag === "circle") return <circle key={key} {...properties} />;
          if (tag === "line") return <line key={key} {...properties} />;
          return <path key={key} {...properties} />;
        })}
      </svg>
    );
  }
  CarbonIcon.displayName = displayName;
  return CarbonIcon;
}

export function createSvgIcon(displayName: string, nodes: IconNode) {
  // WHY: Default 16 matches Carbon icons inside 32px ghost buttons — 24
  // rendered 1.5x too big with 2px-true strokes next to Carbon's 1px.
  function SvgIcon({ size = 16, style, ...rest }: SvgIconProperties) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        // WHY: Inline styles beat Carbon's ghost-button rules, which would
        // otherwise restyle these icons two ways (attributes lose to any
        // CSS): its fill rule paints every closed shape as a solid blob,
        // and its blue button text bleeds through stroke="currentColor".
        // Pinning both to the icon token matches Carbon's own icons in
        // light and dark themes alike.
        style={{ fill: "none", stroke: "var(--cds-icon-primary, #161616)", ...style }}
        {...rest}
      >
        {nodes.map(([tag, attrs]) => {
          const { key, ...properties } = attrs;
          if (tag === "rect") return <rect key={key} {...properties} />;
          if (tag === "circle") return <circle key={key} {...properties} />;
          if (tag === "line") return <line key={key} {...properties} />;
          return <path key={key} {...properties} />;
        })}
      </svg>
    );
  }
  SvgIcon.displayName = displayName;
  return SvgIcon;
}
