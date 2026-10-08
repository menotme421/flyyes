import { useState } from "react";
import { Edit, TrashCan } from "@carbon/icons-react";
import { IconButton, Modal, TextInput } from "@carbon/react";
import type { LocalDocument } from "@/storage/documentTypes";
import { formatDateTime } from "@/utils/textStatistics";
import { DocumentThumbnail } from "./DocumentThumbnail";

// WHY: One card = thumbnail + title + date. Clicking thumbnail or title opens
// the doc (sibling buttons, never nested). Rename/delete live in a hover
// overlay (always visible on touch screens); delete is permanent and always
// gated by a confirm dialog — there is no trash to recover from.
interface DocumentCardProperties {
  document: LocalDocument;
  onOpen: (documentId: string) => void;
  onRename: (documentId: string, newTitle: string) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
}

export function DocumentCard({ document, onOpen, onRename, onDelete }: DocumentCardProperties) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(document.title);
  const [busy, setBusy] = useState(false);

  async function handleRenameSave(): Promise<void> {
    const clean = draft.trim();
    // WHY: Empty or unchanged = cancel, not an error — restore and close.
    if (!clean || clean === document.title) {
      setDraft(document.title);
      setRenaming(false);
      return;
    }
    setBusy(true);
    try {
      await onRename(document.id, clean);
    } finally {
      setBusy(false);
    }
    setRenaming(false);
  }

  async function handleDeleteConfirm(): Promise<void> {
    setBusy(true);
    try {
      await onDelete(document.id);
    } finally {
      setBusy(false);
    }
    setConfirmOpen(false);
  }

  return (
    <div className="fly-swatch group relative flex flex-col overflow-hidden border-border bg-background transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen(document.id)}
        className="block w-full text-left"
        aria-label={`Open ${document.title}`}
      >
        <DocumentThumbnail html={document.contentHtml} title={document.title} />
      </button>

      <div className="fly-card-body">
        {renaming ? (
          <TextInput
            id={`rename-${document.id}`}
            labelText="Rename document"
            hideLabel
            size="sm"
            value={draft}
            autoFocus
            disabled={busy}
            maxLength={200}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void handleRenameSave()}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleRenameSave();
              if (event.key === "Escape") {
                setDraft(document.title);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => onOpen(document.id)}
            title={document.title}
            className="cds--type-body-compact-02 block w-full truncate text-left hover:underline"
          >
            {document.title}
          </button>
        )}
        <p className="cds--type-label-01 fly-card-date truncate leading-tight text-muted-foreground">
          Last updated: {formatDateTime(document.updatedAt)}
        </p>
      </div>

      {/* WHY: Hover-reveal on desktop (touch has no hover, so always visible
          there). Sibling of the open buttons — never nested inside one. */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <IconButton
          kind="secondary"
          size="xs"
          label="Rename"
          aria-label={`Rename ${document.title}`}
          onClick={() => {
            setDraft(document.title);
            setRenaming(true);
          }}
        >
          <Edit />
        </IconButton>
        <IconButton
          kind="secondary"
          size="xs"
          label="Delete forever"
          aria-label={`Delete ${document.title}`}
          onClick={() => setConfirmOpen(true)}
        >
          <TrashCan />
        </IconButton>
      </div>

      <Modal
        open={confirmOpen}
        danger
        size="sm"
        modalHeading="Permanently delete this document?"
        modalLabel={`"${document.title}" will be deleted forever. This cannot be undone.`}
        primaryButtonText={busy ? "Deleting…" : "Delete forever"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={busy}
        onRequestSubmit={() => void handleDeleteConfirm()}
        onSecondarySubmit={() => setConfirmOpen(false)}
        onRequestClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
