import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { mergeClassNames } from "@/lib/utils";

// WHY: shadcn Select on Radix — keyboard navigation, typeahead, and
// screen-reader listbox semantics the native <select> styling couldn't match.

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  hideChevron,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { hideChevron?: boolean }) {
  return (
    <SelectPrimitive.Trigger
      className={mergeClassNames(
        "flex h-8 items-center justify-between gap-1 rounded-md border border-transparent bg-transparent px-2 text-xs outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...rest}
    >
      {children}
      {/* WHY: Icon-style triggers (line spacing) draw their own content and
          need no disclosure arrow; value dropdowns keep the default. */}
      {!hideChevron && (
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </SelectPrimitive.Icon>
      )}
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({ className, children, position = "popper", ...rest }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={mergeClassNames(
          "relative z-50 max-h-72 min-w-32 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
          position === "popper" && "translate-y-1",
          className
        )}
        position={position}
        {...rest}
      >
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...rest }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={mergeClassNames("px-2 py-1.5 text-xs font-semibold", className)}
      {...rest}
    />
  );
}

function SelectItem({ className, children, ...rest }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={mergeClassNames(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-xs outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...rest}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...rest }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={mergeClassNames("-mx-1 my-1 h-px bg-border", className)}
      {...rest}
    />
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
