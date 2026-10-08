import type { SVGProps } from "react";

// WHY: Local replacement for lucide's createLucideIcon — same 24px stroke
// icons, zero dependency (lucide-react is removed). Each icon file keeps its
// path data untouched; only the factory import changed.

type IconNode = Array<[string, Record<string, string>]>;

interface SvgIconProperties extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function createSvgIcon(displayName: string, nodes: IconNode) {
  function SvgIcon({ size = 24, ...rest }: SvgIconProperties) {
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
