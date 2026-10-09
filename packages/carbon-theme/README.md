# @flyyes/carbon-theme (placeholder — not wired yet)

Unified Flyyes brand package. Nothing imports this yet on purpose:
`apps/flyyes-docs` still owns its own Carbon setup until the migration
finishes, and `apps/form-creator` ships its own minimal shell copied from
the same pattern.

Future extraction surface (marked `FUTURE: carbon-theme` in code):
- `apps/flyyes-docs/src/carbon.scss` (whole file, brand-only)
- `.fly-page*` frames, `.fly-banner*`, `.fly-title-row*` chrome from
  `apps/flyyes-docs/src/styles/flyyes.scss` (editor canvas rules stay)
- `ToastHost.tsx` + `toast.ts` as shared brand notifier
- Carbon `Theme white/g100` + OS dark-mode hook + brand `Header` lockup
  from `apps/flyyes-docs/src/App.tsx`

Do NOT move TipTap, Dexie/IndexedDB, DOCX/Markdown, or TipTap print CSS
here — those stay app-specific.
