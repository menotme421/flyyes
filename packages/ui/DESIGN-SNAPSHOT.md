# Flyyes Design System — Snapshot (frozen 2026-10-11, rev 2: lyra-pure)

精简存档：排错对照表。规则：**import（lyra）有的跟，没有的一律回 shadcn
default**。实证方法：preset 原样 `init` 到临时目录，三方 diff。
觉得“长得不像”时，先查 §4（故意的），再查 §5，最后才是 bug。

## 1. 配方冻结

- preset 码：`b5Tht2ovsR`（`--base radix`，`--template vite`，`--pointer`）。
- decode：style lyra / baseColor neutral / theme neutral / chart neutral /
  font roboto / heading roboto-slab / icon lucide / radius default /
  menu inverted-translucent + subtle。
- import 实测值（和猜的不一样，记下来）：
  - radius `default` = **0.625rem**（直角来自组件的 `rounded-none` 硬编码，
    不是 token）。
  - menu `inverted-translucent` 烘焙进 dropdown/context-menu 代码
    （`bg-popover/70` + backdrop-blur），已原样拷入。
  - 字体是 **variable 包**（`@fontsource-variable/*`），mono 无 import。
  - 自带 `tw-animate-css`（菜单动效靠它）+ 按钮 pointer 手型。
- 主题机制：只有 `.dark` 类（无 data-theme）；key 还是 `flyyes-theme`。

## 2. Token 总表（`src/styles/tokens.css` = import 原值）

neutral oklch，light/dark 见文件。chart 是**灰阶**（0.87→0.269），
radius 0.625rem + calc scale，sidebar 按 import 原值。
额外保留（无 import 对应、活代码引用）：spacing 13 档（flyyes.scss）、
shell max/gutter（PageShell）、support-4（toast 色条）。

## 3. 组件快照（`src/components/ui/` = CLI 原样，仅相对路径）

12 件全部拷回 lyra 生成代码：button（text-xs medium，default h-8
px-2.5，destructive 浅红 tint，直角）、toggle（同字号）、input（h-8
透明底 + dark 变体）、dialog（`bg-black/10` + blur 遮罩）、
dropdown/context-menu（半透明 + blur，自带）、popover/tooltip/checkbox/
separator/label/toggle-group（原样）。

## 4. 故意偏离清单（仅 3 项，其余 0 偏离）

1. 相对路径 + 单一 `cn`（monorepo `@/` 撞车，不这么写构建挂）。
2. support-4/spacing/shell 保留（被引用，无处可 map）。
3. `lucide-react@0.475` 保留（import  pin 1.55；所用 glyph 全验证存在，
   大版本升级无收益）。

## 5. App 侧覆盖（`apps/flyyes-docs/src/`）

- `editor/ToolButton.tsx` + `InlineSelect.tsx` + `components/icon16.tsx`
 （工具栏 chrome，非 shadcn 件）。
- 错误红一律 `text-destructive`；toast 色条用 support-4。
- `.fly-*`（`flyyes.scss`）：只剩布局/面板/行/卡片/打印。
- `index.css`：只剩壳、TipTap 画布、打印；黑 header、`shell-content` 已删。
- `toast.ts` API 不变。

## 6. 删了什么

- `src/carbon.scss`、`@carbon/react`、`@carbon/icons-react`、`@ibm/plex`、
  静态 Fontsource（含 mono）、自有 `components/icons/` 15 文件、
  `tests/sheetIcons.test.ts`、zinc 旧 token（备份
  `src/index.css.pre-ui-backup`）。
- 主题多余 var（layer/field/text/icon/link/focus/overlay/selection/
  scrollbar/type 字号/motion/z）和 `data-layer` 属性、`data-theme` 属性。

## 7. 验证基线

- `pnpm --filter @flyyes/flyyes-docs build` ✓（tsc + vite）
- `vitest` 20 文件 158 用例 ✓
- `oxlint` 0 error（27 warning 全历史存量）
- 体积：CSS ~75KB（46KB 时曾漏掉全部 ui 类——见下）；Roboto variable 全子集。
- 整仓 `pnpm build`（含 form-creator）✓——form-creator 的 Carbon 没动。

## 8. 大坑记录：`@source`（2026-10-11）

- 现象：按钮裸奔（无尺寸/边距，文字被裁）、菜单无半透明无动画。
- 根因：`@flyyes/ui` 经 node_modules symlink 被消费，Tailwind v4
  自动扫描跳过它——12 件组件的类一个都没生成，构建还全绿，无警告。
- 修法：`globals.css` 加 `@source "../components/**/*.tsx"` 等三行。
  删其中任何一行都会静默回到裸奔，盯紧。
- 排错手法：`rm dist` 后重 build，直接数 dist CSS 里 `size-8` /
  `bg-popover\/70` / `animate-in` 在不在。注意探针正则转义
  （`left-1/2` 要写成 `left-1\\/2`，否则误报 0）。
