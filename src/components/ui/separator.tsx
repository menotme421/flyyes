import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { mergeClassNames } from "@/lib/utils";

// WHY: shadcn Separator on Radix — correct separator role + orientation.

function Separator({ className, orientation = "horizontal", decorative = true, ...rest }: React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={mergeClassNames(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-5 w-px",
        className
      )}
      {...rest}
    />
  );
}

export { Separator };
