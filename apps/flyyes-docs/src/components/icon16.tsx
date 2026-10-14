import type { ComponentType, ReactElement } from "react";
import type { LucideProps } from "lucide-react";

// WHY: Radix menu components render renderIcon with no size prop (lucide
// defaults to 24, toolbar glyphs are 16). Hoist one const per icon at
// module level so component identity is stable across renders.
export function icon16(Icon: ComponentType<LucideProps>): ComponentType {
  function SizedIcon(): ReactElement {
    return <Icon size={16} />;
  }
  SizedIcon.displayName = `icon16(${Icon.displayName ?? "Icon"})`;
  return SizedIcon;
}
