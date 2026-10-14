import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@flyyes/ui";

// WHY: ui Dialog replacing window.prompt for link/image URLs.
// window.prompt blocks the page, can't be styled, and is a11y-hostile;
// Radix focus trap + inline validation instead. Empty submit means "remove"
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
  // WHY: Keyed remount per open+value — fresh draft each time, no stale
  // picks lingering (replaces the reseeding effect).
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <UrlDialogForm
        key={`${open ? "open" : "shut"}-${initialValue}`}
        title={title}
        description={description}
        placeholder={placeholder}
        initialValue={initialValue}
        submitLabel={submitLabel}
        allowEmpty={allowEmpty}
        showRemove={showRemove}
        removeLabel={removeLabel}
        onRemove={onRemove}
        validate={validate}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    </Dialog>
  );
}

function UrlDialogForm({
  title,
  description,
  placeholder,
  initialValue,
  submitLabel,
  allowEmpty,
  showRemove,
  removeLabel,
  onRemove,
  validate,
  onSubmit,
  onClose,
}: Omit<UrlDialogProperties, "open">) {
  const [draft, setDraft] = useState<string>(initialValue ?? "");
  const [error, setError] = useState<string | null>(null);

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
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div>
        <Label htmlFor="url-dialog-input" className="sr-only">
          {title}
        </Label>
        <Input
          id="url-dialog-input"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSubmit();
          }}
          placeholder={placeholder}
          aria-invalid={error !== null}
        />
        {error ? (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        {showRemove ? (
          <Button
            variant="destructive"
            size="sm"
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
        <Button variant="default" size="sm" onClick={handleSubmit}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
