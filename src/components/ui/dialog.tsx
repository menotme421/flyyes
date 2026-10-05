import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { mergeClassNames } from "@/lib/utils";

// WHY: Real shadcn Dialog on Radix — focus trap, Escape, overlay click,
// and screen-reader roles for free (the old hand-rolled dialog had none).

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({ className, ...rest }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={mergeClassNames("fixed inset-0 z-50 bg-black/50", className)}
      {...rest}
    />
  );
}

function DialogContent({ className, children, ...rest }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={mergeClassNames(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border border-border bg-background p-6 shadow-lg",
          className
        )}
        {...rest}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={mergeClassNames("flex flex-col gap-1.5 text-left", className)} {...rest} />;
}

function DialogTitle({ className, ...rest }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={mergeClassNames("text-lg font-semibold leading-none tracking-tight", className)}
      {...rest}
    />
  );
}

function DialogDescription({ className, ...rest }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={mergeClassNames("text-sm text-muted-foreground", className)}
      {...rest}
    />
  );
}

function DialogFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={mergeClassNames("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...rest}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
