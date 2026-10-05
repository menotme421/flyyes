import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { mergeClassNames } from "@/lib/utils";

// WHY: shadcn Popover on Radix — used for the Word-style table grid picker.
// Focus management + Escape + outside-click built in.

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

function PopoverContent({ className, align = "center", sideOffset = 4, ...rest }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={mergeClassNames(
          "z-50 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none",
          className
        )}
        {...rest}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
