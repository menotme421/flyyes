// WHY: Single source of truth for what a "document" is in local IndexedDB.
// No server DB for V1 — this mirrors the approved schema (documents + snapshots + settings).

export interface LocalDocument {
  id: string;
  title: string;
  // TipTap JSON (source of truth for editing) + HTML (fast preview/export)
  contentJson: string;
  contentHtml: string;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  isTrashed: boolean;
  // WHY: Optional so V1 docs (created before page setup) open fine — code falls back to defaults.
  pageMargins?: PageMargins;
  // WHY: Preset-driven page setup (paper + orientation + margins in one pick).
  // Optional like pageMargins: legacy docs without it resolve via resolvePageSetup().
  pagePresetId?: string;
  // WHY: Orientation is orthogonal to paper+margins (any paper can be
  // landscape). Optional: legacy docs resolve to portrait.
  pageOrientation?: PageOrientation;
}

// WHY: Per-document A4 margins in centimeters, like Word's Page Setup.
// Stored per doc (not global) so each document keeps its own layout.

export interface PageMargins {
  topCm: number;
  rightCm: number;
  bottomCm: number;
  leftCm: number;
}

// WHY: Page orientation lives apart from the paper+margins preset so any
// paper can go landscape (Compact + Landscape included).

export type PageOrientation = "portrait" | "landscape";

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  titleSnapshot: string;
  contentJson: string;
  createdAt: number;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  totalCount: number;
  page: number;
  limit: number;
}
