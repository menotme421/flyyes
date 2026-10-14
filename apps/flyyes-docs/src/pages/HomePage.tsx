import { useEffect, useState } from "react";
import { Button } from "@flyyes/ui";
import { DocumentCard } from "@/components/DocumentCard";
import { PageShell } from "@flyyes/ui";
import { createLocalDocument, deleteDocumentForever, listLocalDocuments, renameLocalDocument } from "@/services/documentService";
import type { LocalDocument } from "@/storage/documentTypes";
import { logError } from "@/utils/appLogger";

// WHY: Home = document grid. First tile creates a doc, the rest open docs —
// no search, no import, no trash view (confirm-then-delete is permanent).
// No router dep — parent App switches pages via state to minimize dependencies.
interface HomePageProperties {
  onOpenDocument: (documentId: string) => void;
}

export function HomePage({ onOpenDocument }: HomePageProperties) {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const pageLimit = 20;

  async function refreshList(): Promise<void> {
    try {
      const result = await listLocalDocuments({ page, limit: pageLimit });
      setDocuments(result.items);
      setTotalCount(result.totalCount);
    } catch (error) {
      logError("Home list failed", { page });
      setNotice(error instanceof Error ? error.message : "Could not load documents.");
    }
  }

  useEffect(() => {
    void refreshList();
  }, [page]);

  async function handleCreate(): Promise<void> {
    try {
      // WHY: No title prompt — Untitled keeps the grid one tap; rename lives
      // on the card (hover) and in the editor title row.
      const created = await createLocalDocument("Untitled document");
      setNotice(null);
      onOpenDocument(created.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create document.");
    }
  }

  async function handleRename(documentId: string, newTitle: string): Promise<void> {
    try {
      await renameLocalDocument(documentId, newTitle);
      setNotice(null);
      await refreshList();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Rename failed.");
    }
  }

  async function handleDelete(documentId: string): Promise<void> {
    try {
      await deleteDocumentForever(documentId);
      setNotice(null);
      // WHY: Deleting the last card on a later page would strand an empty
      // page — step back instead of showing nothing.
      if (documents.length <= 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await refreshList();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete document.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageLimit));

  return (
    <PageShell>
    <div className="fly-page">
      {notice ? <p className="text-sm fly-banner fly-notice rounded-md bg-muted">{notice}</p> : null}

      {/* WHY: Real page head — heading + count + New action — so the grid
          reads as a page, not cards stranded in a corner. */}
      <div className="fly-page-head">
        <div>
          <h1 className="font-heading text-xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount === 0
              ? "Stored in this browser"
              : `${totalCount} document${totalCount === 1 ? "" : "s"} · stored in this browser`}
          </p>
        </div>
        <Button size="default" onClick={() => void handleCreate()}>
          New document
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        <button
          type="button"
          onClick={() => void handleCreate()}
          aria-label="New document"
          title="New document"
          className="fly-swatch flex aspect-[210/297] items-center justify-center border border-dashed border-border bg-muted text-4xl leading-none text-primary transition-colors hover:bg-accent"
        >
          <span aria-hidden="true">+</span>
        </button>
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onOpen={onOpenDocument}
            onRename={(id, title) => handleRename(id, title)}
            onDelete={(id) => handleDelete(id)}
          />
        ))}
      </div>

      {totalCount === 0 ? (
        <p className="text-sm fly-empty text-center text-muted-foreground">
          No documents yet. Tap + to create your first one — it stays in this browser.
        </p>
      ) : null}

      {totalPages > 1 ? (
        <div className="text-sm fly-pagination flex items-center justify-between text-muted-foreground">
          <span>{totalCount} total · page {page}/{totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
    </PageShell>
  );
}
