import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// WHY: Shadcn dialog replacing window.prompt for link/image URLs.
// window.prompt blocks the page, can't be styled, and is a11y-hostile;
// this keeps focus trap + validation inline. Empty submit means "remove"
// when allowEmpty (link), otherwise invalid.

interface UrlDialogProperties {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  placeholder: string;
  initialValue?: string;
  submitLabel: string;
  allowEmpty?: boolean;
  showRemove?: boolean;
  removeLabel?: string;
  onRemove?: () => void;
  validate: (url: string) => string | null;
  onSubmit: (url: string) => void;
}

export function UrlDialog({
  open,
  onClose,
  title,
  description,
  placeholder,
  initialValue = "",
  submitLabel,
  allowEmpty = false,
  showRemove = false,
  removeLabel = "Remove",
  onRemove,
  validate,
  onSubmit,
}: UrlDialogProperties) {
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initialValue);
      setError(null);
    }
  }, [open, initialValue]);

  function handleSubmit(): void {
    const trimmed = draft.trim();
    if (trimmed === "" && allowEmpty) {
      onSubmit("");
      onClose();
      return;
    }
    const problem = validate(trimmed);
    if (problem) {
      setError(problem);
      return;
    }
    onSubmit(trimmed);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") handleSubmit(); }}
          placeholder={placeholder}
          aria-label={title}
          inputMode="url"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          {showRemove ? (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto text-destructive hover:text-destructive"
              onClick={() => {
                onRemove?.();
                onClose();
              }}
            >
              {removeLabel}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
