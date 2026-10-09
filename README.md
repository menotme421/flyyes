# Flyyes — brand monorepo (Cloudflare-only, solo)

One Git repo, every web app under the Flyyes brand. Local-first by default, $0 Pages hosting, no Vercel.

## Structure

```
apps/
  flyyes-docs/     # live docs app (moved from repo root, history kept)
  form-creator/    # new: URL + P2P low-cost forms (scaffold shell)
packages/
  carbon-theme/    # placeholder — future unified brand (NOT wired yet)
  tsconfig/        # shared TS base (@flyyes/tsconfig/base.json)
```

## Commands (from repo root, needs `pnpm@10`)

```bash
pnpm install                 # install all workspaces
pnpm build                   # turbo: build every app
pnpm test                    # turbo: test every app
pnpm --filter @flyyes/flyyes-docs dev      # docs on :5173
pnpm --filter @flyyes/form-creator dev     # forms (own port)
```

## Deploy — one Pages project per app, same repo

| App | Pages URL (canonical) | Root directory | Build | Output | Node |
|-----|---------------------------------------|-------|--------|------|
| flyyes-docs | `https://flyyes-7z5.pages.dev/` | `apps/flyyes-docs` | `npm run build` | `dist` | env `NODE_VERSION=22` (Pages ignores the root `.nvmrc` in a subfolder Root) |
| form-creator | (no project yet) | `apps/form-creator` | `npm run build` | `dist` | env `NODE_VERSION=22` |

Account map: Cloudflare account **`flyyes`** (brand) holds every brand project.
The old `flyyes.pages.dev` project in the personal account is retired; the
stray `flyyes-ehk.pages.dev` copy is not linked anywhere.

WARNING: the flyyes-docs Pages project must change Root `/` → `apps/flyyes-docs` after this move, or its builds fail. form-creator gets a brand-new Pages project (never reuse the docs one).

500 builds/month quota is shared across all projects on the account.

## Rules carried from AGENTS.md

- Brand-shared goes to `packages/carbon-theme` only when 2 apps need it; app-specific (TipTap, Dexie, DOCX) never moves.
- Local-first default; a backend (Workers + D1/R2) lives inside the app that needs it.
- Small commits, no `node_modules`/`.env`/`dist`, explain approach + trade-offs before code.
