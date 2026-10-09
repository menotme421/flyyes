import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Modal, TextInput } from "@carbon/react";

// WHY: Carbon Modal replacing window.prompt for link/image URLs.
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

  // WHY: Portaled to document.body — callers live inside the sticky ribbon,
  // whose stacking context would otherwise trap this fixed overlay below
  // the title row (dialog top visibly sliced off).
  if (!open) return null;
  return createPortal(
    <Modal
      open={open}
      modalHeading={title}
      modalLabel={description}
      primaryButtonText={submitLabel}
      secondaryButtonText="Cancel"
      onRequestSubmit={handleSubmit}
      onSecondarySubmit={onClose}
      onRequestClose={onClose}
      // WHY: Enter is handled by the input below — Modal's own Enter-submit
      // would double-fire and insert the link twice.
      shouldSubmitOnEnter={false}
      size="sm"
    >
      <TextInput
        id="url-dialog-input"
        labelText={title}
        hideLabel
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleSubmit();
        }}
        placeholder={placeholder}
        invalid={error !== null}
        invalidText={error ?? ""}
      />
      {showRemove ? (
        <Button
          kind="danger--ghost"
          size="sm"
          className="fly-dialog-remove"
          onClick={() => {
            onRemove?.();
            onClose();
          }}
        >
          {removeLabel}
        </Button>
      ) : null}
    </Modal>,
    document.body
  );
}
