import { ChevronDown } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@flyyes/ui";

// WHY: Inline toolbar select — trigger shows the short value, menu lists full
// labels. Replaces the old inline Dropdown (label/items/selectedItem/onChange).
export function InlineSelect({ id, label, value, displayValue, icon, items, onChange, className }: {
  id: string;
  label: string;
  value: string;
  displayValue?: string;
  icon?: React.ReactNode;
  items: string[];
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          id={id}
          aria-label={label}
          className={className}
        >
          <span className="flex max-w-full items-center gap-1.5 truncate">
            {icon}
            <span className="truncate">{displayValue ?? value}</span>
          </span>
          <ChevronDown size={12} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {items.map((item) => (
          <DropdownMenuItem
            key={item}
            onSelect={() => onChange(item)}
            className={item === value ? "bg-accent text-accent-foreground" : undefined}
          >
            {item}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
