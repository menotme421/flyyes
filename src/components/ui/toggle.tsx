import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { mergeClassNames } from "@/lib/utils";

// WHY: shadcn Toggle on Radix — pressed state with aria-pressed for free.

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors outline-none hover:bg-muted disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5",
  {
    variants: {
      size: {
        default: "h-8 px-2",
        sm: "h-7 px-1.5",
      },
    },
    defaultVariants: { size: "default" },
  }
);

function Toggle({ className, ...rest }: React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      className={mergeClassNames(toggleVariants(), className)}
      {...rest}
    />
  );
}

export { Toggle, toggleVariants };
