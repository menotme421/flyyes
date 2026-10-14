import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@flyyes/ui";

// WHY: One toolbar button chrome — icon + bottom tooltip + pressed state.
// Replaces the old IconButton pattern (label/tooltip/selected in one). Needs a
// TooltipProvider ancestor (mounted once in App).
export function ToolButton({ title, active, disabled, onClick, className, children }: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  // WHY: Optional — inside a Radix Trigger or a wrapper that owns the toggle
  // (ColorPicker), there is no direct click to handle.
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          title={title}
          aria-label={title}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className={active ? `bg-accent text-accent-foreground${className ? ` ${className}` : ""}` : className}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{title}</TooltipContent>
    </Tooltip>
  );
}
