# @flyyes/ui — brand package (preset b5Tht2ovsR, radix-lyra)

Single source of truth for Flyyes brand. Tokens = preset values verbatim
(`src/styles/tokens.css`); components = CLI output verbatim except relative
imports (see below). Full frozen spec: `DESIGN-SNAPSHOT.md`.

## Rule

- Import (lyra) has it → follow it. Neither lyra nor default has it → don't
  invent it. Deliberate deviations are listed at the bottom.
- Radius = preset `default` (0.625rem + calc scale). Lyra components hardcode
  `rounded-none` themselves — that sharpness IS lyra, keep it.
- Menus = preset `inverted-translucent` (baked into lyra dropdown/context
  code: `bg-popover/70` + backdrop blur). Don't re-solid them.
- Fonts = Roboto Variable + Roboto Slab Variable (Fontsource variable pkgs).

## Tailwind v4

- Only `packages/ui/src/styles/globals.css` is maintained (import base layer:
  border/outline reset, body bg/fg, pointer cursor on buttons, font-sans).
- `@source` lines in globals are load-bearing: the package reaches apps as a
  node_modules symlink which Tailwind skips — without them NO ui class
  generates (silent unstyled buttons/menus; CSS was 46KB, fixed 75KB).

## Spacing / shell (plumbing, no import counterpart)

- `flyyes.scss` uses `var(--spacing-01…13)`; `PageShell` uses
  `--shell-max-width`/`--shell-gutter`. Values are scale constants.
- Micro tweaks inside components: default Tailwind (p-2/gap-2) allowed.

## Toast hues (gap-fill, no import counterpart)

- `--support-error/success/warning/info` exist ONLY for toast kind bars.
- Never for text (errors use `text-destructive`).

## Links

- Button links: `<Button asChild>` or data-slot="button".

## Theme

- `index.html` inline script required (same key `flyyes-theme`).
- Hook in `src/hooks/use-theme.ts`; syncs `.dark` class + colorScheme.
- No second theme provider. No `data-theme` attribute.

## Adding components

- Always `pnpm dlx shadcn@latest add <name> -c packages/ui`.
- Never add into apps locally; app `ui` alias points at the package.
- After every add: replace `@/lib/utils` → `../../lib/utils` and
  `@/components/ui/*` → `./*` (relative — docs resolves `@/` to its own
  src, so `@/` imports inside the package break its build). Drop any `cn`
  npm dep the CLI adds; single `cn` lives in `src/lib/utils.ts`.
- Never restyle generated code (no size/color/z/radius tweaks).

## Deliberate deviations (only these)

1. Relative imports + single `cn` (monorepo `@/` collision forces it).
2. Support-4 hues + spacing/shell scales (referenced, nothing to map to).
3. `lucide-react@0.475` kept (import pins 1.55; every used glyph verified
   present — major bump is risk without benefit).
