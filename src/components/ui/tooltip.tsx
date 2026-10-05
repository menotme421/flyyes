import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { mergeClassNames } from "@/lib/utils";

// WHY: shadcn Tooltip on Radix — replaces native title attributes
// (slow, unstylable, double-announced with aria-labels).

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({ className, sideOffset = 4, ...rest }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={mergeClassNames(
          "z-50 overflow-hidden rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-md",
          className
        )}
        {...rest}
      />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
