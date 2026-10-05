import * as React from "react";
import { mergeClassNames } from "@/lib/utils";

// WHY: Copy-owned shadcn-style input. Native <input> keeps it accessible
// without pulling Radix/Base UI for V1 (minimize dependencies per project rules).
export function Input({ className, type = "text", ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={mergeClassNames(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className
      )}
      {...rest}
    />
  );
}
