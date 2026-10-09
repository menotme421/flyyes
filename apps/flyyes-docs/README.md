# Flyyes Docs — local Word-like docs (V2 free merge)

Simple, fast, private docs that live **in your browser**. No login, no server, $0 hosting on Cloudflare Pages.

Built with Vite + React + TypeScript + Tailwind v4 + Carbon Design System (`@carbon/react`, IBM Plex) + TipTap + Dexie (IndexedDB) + docx.

## What it does
- Home grid: A4 thumbnail cards (live first-page miniature), one-tap + tile, hover rename, confirm-then-permanent-delete, pagination
- Word/Docs-ordered toolbar (File, History, Styles, Font, Paragraph, Insert, View): styles dropdown (H1-H6), font name/size, bold/italic/underline/strike, subscript/superscript, text color/highlight, clear formatting, align, line spacing, lists (bullet, numbered, task), code block, indent, quote, find & replace (Ctrl+F), single Insert menu (link, image URL + upload, resizable images, page break, 10×8 table grid picker), single Export menu, Edit/Pages switch
- Bottom status bar: live word + character counts, save status
- Word-style color picking everywhere (text, highlight, cell fill): procedural 127-cell HSL honeycomb (pure SVG, zero color data) + grayscale + preview halo, inspector (HEX/RGB/HSV/CMYK, WCAG contrast, harmony palettes), plus a Custom tab (spectrum square, hue slider, hex)
- Right-click table menu with flyout submenus (Rows, Columns, Cells with merge/split, Fill, Style with header row/column/borders/alignment, Delete) — right-clicks inside a live cell selection keep it so merge stays enabled; column widths drag from cell-edge handles — right-clicks outside tables keep the native browser menu
- Page setup per document (margins in cm, like Word) — applies to edit page, Pages preview, and DOCX export. No ruler bar; same functions via dialog + indent buttons
- A4 Pages preview (free pagination, no Pro): preview true sheets with header/footer + page numbers, horizontal line = page break, Print → PDF via @page CSS. Preview and edit gaps share one pagination engine (measured DOM in the editor, geometry-aware estimates in preview)
- Visible page gaps while editing (plain Docs-style strips measured from real layout; hidden in print/export, manual line break forces one, huge docs degrade gracefully)
- Markdown: Export .md (GFM tables) via @tiptap/markdown. Embedded uploads collapse to readable `[image: alt]` placeholders (remote URLs stay intact)
- Real .docx: Export via docx lib mapper (faithful, not byte-identical). Images: uploads embed at true aspect ratio, remote https images are fetched at export (hosts that block downloads are listed in a toast instead of failing silently)
- Autosaves in this browser (IndexedDB), Export JSON/HTML/MD/DOCX. No trash — delete is permanent (confirm dialog).
- Backup reminder: clearing site data erases docs — export if they matter

## Setup
```bash
npm install
npm run dev    # http://localhost:5173
```

## Run / build
```bash
npm run dev      # local dev
npm run build    # typecheck + production build -> dist/
npm run preview  # preview dist/
npm test         # basic unit tests (validator, word count)
```

## Deploy to Cloudflare Pages (free, unlimited bandwidth)
> WARNING — monorepo move: this app now lives at `apps/flyyes-docs/`.
> In the existing Pages project, change **Root directory: `/` → `apps/flyyes-docs`**,
> keep build `npm run build`, output `dist`. Until you change it, deploys will
> fail (Pages looks for `package.json` at the old root).
1. Push this repo to GitHub.
2. Cloudflare Dashboard → Workers & Pages → existing flyyes project → Settings → Builds.
3. Exact saved settings:
   - Framework preset: `Vite`
   - **Root directory: `apps/flyyes-docs`** (no leading slash)
   - Build command: `npm run build`, Output directory: `dist`
   - Env var: `NODE_VERSION=22` (required — Vite 8 needs Node 22; Pages does
     not read the root `.nvmrc` when Root is a subfolder)
   - Env vars: none needed (local-first, no `.env`)
4. Custom domain + HTTPS are free. 500 builds/month shared per account, 20k files/site.
5. After connect, verify `_headers` applies (CSP) + OG image loads at `/og-image.png`.

## Monorepo notes (moved — Plan A done)
- This app moved `repo root/` → `apps/flyyes-docs/` with history kept (`git mv` renames).
- Future `packages/carbon-theme` surface (do NOT extract yet): `src/carbon.scss`, `src/styles/flyyes.scss` layout tokens, `src/components/ToastHost.tsx` + `src/components/toast.ts`, brand header in `src/App.tsx` (`Header` + `fly-brand-*`), OS dark-mode `Theme white/g100` hook. Marked `FUTURE: carbon-theme` in code.
- Stay app-specific (never move to shared): TipTap editor in `src/editor/`, Dexie/IndexedDB in `src/storage/` + `src/services/documentService.ts`, DOCX/Markdown export, TipTap print CSS in `src/index.css`.
- Alias rule: `@/*` → `./src/*` (relative to this folder, survives the move).
- Backend rule: local-first. A product needing AI/DB gets its own Workers + D1/R2 inside its app folder.

## Folder structure
```
src/
  pages/         HomePage (card grid/pagination), EditorPage (title+export)
  components/    DocumentCard, DocumentThumbnail, AppErrorBoundary, ExportMenu, UrlDialog, PageSetupDialog, ZoomSelect, DocumentPagePreview, SearchPanel, StatusBar
  components/ui/ button, input, dialog, select, dropdown-menu, toggle, toggle-group, tooltip, separator, sonner (Radix-backed shadcn, copy-owned)
  editor/        DocumentEditor (TipTap), EditorToolbar
  storage/       documentTypes, documentDatabase (Dexie IndexedDB v1)
  services/      documentService (CRUD+paginate), exportImportService (export only)
  utils/         documentValidator, textStatistics, appLogger
  lib/           utils (mergeClassNames for Tailwind)
tests/           validator + word-count edge cases
```

## Architecture decisions (why)
- **Frontend-only, no backend:** you asked local-first, no login. Zero cost, private, instant. Trade-off: no sync across devices; V2 could add Workers + D1 + R2.
- **TipTap over Quill/Draft.js:** actively maintained (v3.31.x), ProseMirror-based, safe defaults. Quill stale, Draft deprecated.
- **Official free extensions for search + tasks:** `@tiptap/extension-find-and-replace` (MIT, headless — own UI in SearchPanel) and `@tiptap/extension-list` TaskList/TaskItem (MIT, GFM-compatible) instead of hand-rolled matching. Trade-off: ~30KB extra in the lazy editor chunk; search marks are screen-only decorations (never exported/printed).
- **shadcn (Radix-backed, copy-owned) vs MUI/Chakra:** you own the code, Tailwind look, no vendor lock-in. Dialogs get focus trap + Escape, selects/dropdowns get keyboard + screen-reader semantics, toolbar buttons get tooltips, errors use Sonner toasts instead of alerts. Trade-off: Radix adds ~140KB to the initial bundle (lazy editor chunk unaffected).
- **Dexie/IndexedDB over localStorage:** 5MB limit too small for docs; IndexedDB holds 100s of MB.
- **No react-router:** two views fit in state, saves a dependency.

## Security notes (V1 specific)
- Titles render as plain text (React escapes); thumbnails render TipTap-generated HTML only (no script nodes possible, never raw file bytes).
- No import surface (import UI removed) — no file-content attack path.
- No passwords/tokens to leak; no `.env` needed. Central logger never logs content.
- HTTPS comes from Cloudflare Pages by default; Content-Security-Policy + hardening headers ship via `public/_headers` (Pages applies them, not by default).

## Limits
- ~5MB per doc, export reminder shown in UI.
- One editor autosave at a time (800ms debounce).
