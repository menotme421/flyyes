import Dexie, { type Table } from "dexie";
import type { DocumentSnapshot, LocalDocument } from "./documentTypes";

// WHY: IndexedDB (not localStorage) because docs can exceed 5MB.
// Dexie is one tiny wrapper so we avoid 50 lines of raw IndexedDB boilerplate.
class DocumentDatabase extends Dexie {
  documents!: Table<LocalDocument, string>;
  snapshots!: Table<DocumentSnapshot, string>;

  constructor() {
    super("flyyes-word-database");
    // Version 1 = approved V1 schema. Bump version + migrate for future changes, never wipe blindly.
    this.version(1).stores({
      documents: "id, updatedAt, isTrashed",
      snapshots: "id, documentId, createdAt",
    });
    // Version 2 = per-document pageMargins (optional field, same indexes).
    // No data migration needed: old docs simply resolve to default margins in code.
    this.version(2).stores({
      documents: "id, updatedAt, isTrashed",
      snapshots: "id, documentId, createdAt",
    });
  }
}

export const documentDatabase = new DocumentDatabase();
