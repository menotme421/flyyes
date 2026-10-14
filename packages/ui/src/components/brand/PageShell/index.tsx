import type { ReactNode } from "react";
import { cn } from "../../../lib/utils.ts";

// WHY: Brand page frame — max 1280 shell, 16px gutter, header offset.
// Header itself arrives in P1 (FlyHeader); this is layout only.
export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("min-h-dvh bg-background text-foreground", className)}>
      <div className="mx-auto w-full max-w-[var(--shell-max-width)] px-[var(--shell-gutter)]">
        {children}
      </div>
    </div>
  );
}
