import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { mergeClassNames } from "@/lib/utils";
import { toggleVariants } from "./toggle";

// WHY: shadcn ToggleGroup on Radix — single-select Edit/View switch
// with roving focus and proper radiogroup semantics.

const ToggleGroup = ToggleGroupPrimitive.Root;

function ToggleGroupItem({ className, children, ...rest }: React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={mergeClassNames(toggleVariants({ size: "sm" }), "px-2", className)}
      {...rest}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
