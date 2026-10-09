# Flyyes Forms (scaffold)

Low-cost form creator: build a form → share it inside a URL link → respondents fill locally. Local-first, no login, $0 Pages hosting.

## Setup

```bash
# from monorepo root
pnpm install
pnpm --filter @flyyes/form-creator dev
```

## Deploy to Cloudflare Pages (new project, does NOT touch flyyes-docs)

1. Workers & Pages → Create → Pages → Connect same Git repo.
2. Exact settings:
   - Framework preset: `Vite`
   - **Root directory: `apps/form-creator`** (this is what keeps deploys independent)
   - Build command: `npm run build` (Pages runs it inside the root dir)
   - Output directory: `dist`
   - Node version: `22` via root `.nvmrc`
3. Custom domain + HTTPS free.

## Status

Shell only: brand header + 3 placeholder cards. Real builder / URL codec / collectors come next.
