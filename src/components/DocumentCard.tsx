import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { LocalDocument } from "@/storage/documentTypes";
import { formatDateTime } from "@/utils/textStatistics";
import { DocumentThumbnail } from "./DocumentThumbnail";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

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
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen(document.id)}
        className="block w-full text-left"
        aria-label={`Open ${document.title}`}
      >
        <DocumentThumbnail html={document.contentHtml} title={document.title} />
      </button>

      <div className="border-t border-border p-2.5">
        {renaming ? (
          <Input
            value={draft}
            autoFocus
            disabled={busy}
            maxLength={200}
            aria-label="Rename document"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void handleRenameSave()}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleRenameSave();
              if (event.key === "Escape") {
                setDraft(document.title);
                setRenaming(false);
              }
            }}
            className="h-7 px-2 text-sm font-medium"
          />
        ) : (
          <button
            type="button"
            onClick={() => onOpen(document.id)}
            title={document.title}
            className="block w-full truncate text-left text-sm font-medium hover:underline"
          >
            {document.title}
          </button>
        )}
        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
          Last updated: {formatDateTime(document.updatedAt)}
        </p>
      </div>

      {/* WHY: Hover-reveal on desktop (touch has no hover, so always visible
          there). Sibling of the open buttons — never nested inside one. */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Button
          variant="outline"
          size="icon"
          aria-label={`Rename ${document.title}`}
          title="Rename"
          className="h-6 w-6 border-border bg-background/95 shadow-sm"
          onClick={() => {
            setDraft(document.title);
            setRenaming(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Delete ${document.title}`}
          title="Delete forever"
          className="h-6 w-6 border-border bg-background/95 shadow-sm hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete this document?</DialogTitle>
            <DialogDescription>
              &ldquo;{document.title}&rdquo; will be deleted forever. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => void handleDeleteConfirm()}>
              {busy ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
