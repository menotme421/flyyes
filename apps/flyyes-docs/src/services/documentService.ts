import { documentDatabase } from "@/storage/documentDatabase";
import type { LocalDocument, PaginatedResult, PageOrientation } from "@/storage/documentTypes";
import { logError } from "@/utils/appLogger";
import { isContentSizeSafe, sanitizeTitle } from "@/utils/documentValidator";
import { countWordsFromText, createDocumentId, extractPlainTextFromHtml } from "@/utils/textStatistics";
import { DEFAULT_PRESET_ID, findPreset } from "./pageSetupService";

// WHY: All IndexedDB access lives here (not in components) so UI stays thin
// and queries stay consistent. Every list is paginated per performance rules.

const DEFAULT_LIMIT = 20;

export async function createLocalDocument(title: string): Promise<LocalDocument> {
  const cleanTitle = sanitizeTitle(title) || "Untitled document";
  const now = Date.now();
  const fresh: LocalDocument = {
    id: createDocumentId(),
    title: cleanTitle,
    contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
    contentHtml: "",
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
    isTrashed: false,
  };
  try {
    await documentDatabase.documents.add(fresh);
    return fresh;
  } catch (error) {
    logError("Failed to create document", {});
    throw new Error("Could not create document. Storage may be full.");
  }
}

export async function listLocalDocuments(options: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<LocalDocument>> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? DEFAULT_LIMIT));

  try {
    // WHY: No trash view on Home — trashed docs (legacy) stay hidden, delete
    // is permanent via deleteDocumentForever.
    const all = await documentDatabase.documents
      .orderBy("updatedAt")
      .reverse()
      .filter((doc) => !doc.isTrashed)
      .toArray();
    const totalCount = all.length;
    const start = (page - 1) * limit;
    return { items: all.slice(start, start + limit), totalCount, page, limit };
  } catch (error) {
    logError("Failed to list documents", { page });
    throw new Error("Could not load documents.");
  }
}

export async function getLocalDocument(documentId: string): Promise<LocalDocument | undefined> {
  try {
    return await documentDatabase.documents.get(documentId);
  } catch (error) {
    logError("Failed to get document", {});
    throw new Error("Could not open document.");
  }
}

export async function saveLocalDocumentContent(
  documentId: string,
  contentJson: string,
  contentHtml: string
): Promise<void> {
  if (!isContentSizeSafe(contentJson)) {
    throw new Error("Document is too large (over 5MB). Split it or remove images.");
  }
  const plainText = extractPlainTextFromHtml(contentHtml);
  try {
    await documentDatabase.documents.update(documentId, {
      contentJson,
      contentHtml,
      wordCount: countWordsFromText(plainText),
      updatedAt: Date.now(),
    });
  } catch (error) {
    logError("Failed to save document", {});
    throw new Error("Could not save. Browser storage may be blocked.");
  }
}

export async function renameLocalDocument(documentId: string, newTitle: string): Promise<void> {
  const cleanTitle = sanitizeTitle(newTitle);
  if (!cleanTitle) throw new Error("Title cannot be empty.");
  await documentDatabase.documents.update(documentId, { title: cleanTitle, updatedAt: Date.now() });
}

export async function updatePageSetup(
  documentId: string,
  presetId: string,
  orientation: PageOrientation
): Promise<void> {
  // WHY: Unknown ids fall back to the default preset so a stale id can never corrupt layout.
  try {
    await documentDatabase.documents.update(documentId, {
      pagePresetId: findPreset(presetId)?.id ?? DEFAULT_PRESET_ID,
      pageOrientation: orientation === "landscape" ? "landscape" : "portrait",
      updatedAt: Date.now(),
    });
  } catch (error) {
    logError("Failed to save page setup", {});
    throw new Error("Could not save page setup.");
  }
}

export async function deleteDocumentForever(documentId: string): Promise<void> {
  try {
    await documentDatabase.transaction("rw", documentDatabase.documents, documentDatabase.snapshots, async () => {
      await documentDatabase.documents.delete(documentId);
      await documentDatabase.snapshots.where("documentId").equals(documentId).delete();
    });
  } catch (error) {
    logError("Failed to permanently delete document", {});
    throw new Error("Could not delete document.");
  }
}
