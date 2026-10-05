import { Decoration, Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { planPageBreaksWithFiller, planTailFiller } from "@/services/paginationPlanner";
import { PAGE_BREAK_MARKER_CLASS } from "./pageBreakExtension";

// WHY: Independent white sheets over one flat ProseMirror doc (block-push V1).
// Each page boundary is a view-only widget spacer:
//   [white filler → page bottom][prev page bottom margin][gray gap]
//   [next page top margin]
// so every sheet — first, middle, last — is exactly padTop + contentH +
// padBottom tall, matching print and DOCX geometry. A tail filler closes the
// LAST page so short final pages still render as a full sheet. Doc JSON, undo,
// and word count are untouched (manual v3 decorations, zero transactions,
// never saved/exported). Blocks are never split; oversized blocks overflow
// like the preview. Spacers hide in print via CSS; recompute only happens on
// idle, never mid-IME.

export const PAGE_GAP_STRIP_CLASS = "page-gap-strip";
export const PAGE_SPACER_CLASS = "page-spacer";
export const PAGE_FILLER_CLASS = "page-filler";
export const PAGE_SHEET_PAD_CLASS = "page-sheet-pad";
export const PAGE_GAP_HEIGHT_PX = 28;
/** Graceful degradation: skip measuring past this many top-level nodes. */
export const MAX_MEASURED_BLOCKS = 2000;
/** Skip sub-pixel churn so steady state dispatches nothing. */
const MIN_FILLER_PX = 4;

function buildSheetPad(which: "top" | "bottom"): HTMLElement {
  // WHY: Per-page margins live in CSS vars on .word-page (per-document cm +
  // zoom). Reading them via var() keeps spacers in sync without plumbing px
  // through the recompute scheduler.
  const pad = document.createElement("div");
  pad.className = `${PAGE_SHEET_PAD_CLASS} ${which === "top" ? "page-sheet-pad-top" : "page-sheet-pad-bottom"}`;
  pad.style.height = which === "top" ? "var(--page-pad-top, 40px)" : "var(--page-pad-bottom, 40px)";
  return pad;
}

function buildSpacerElement(fillerHeightPx: number): HTMLElement {
  const spacer = document.createElement("div");
  spacer.className = `${PAGE_SPACER_CLASS} no-print`;
  spacer.setAttribute("contenteditable", "false");

  const filler = document.createElement("div");
  filler.className = PAGE_FILLER_CLASS;
  if (fillerHeightPx > 0) {
    filler.style.height = `${Math.round(fillerHeightPx)}px`;
  } else {
    filler.style.display = "none";
  }

  const gap = document.createElement("div");
  gap.className = `${PAGE_GAP_STRIP_CLASS}`;
  gap.style.height = `${PAGE_GAP_HEIGHT_PX}px`;

  spacer.append(filler, buildSheetPad("bottom"), gap, buildSheetPad("top"));
  return spacer;
}

function buildTailElement(tailHeightPx: number): HTMLElement {
  const spacer = document.createElement("div");
  spacer.className = `${PAGE_SPACER_CLASS} page-tail no-print`;
  spacer.setAttribute("contenteditable", "false");

  const filler = document.createElement("div");
  filler.className = PAGE_FILLER_CLASS;
  filler.style.height = `${Math.round(tailHeightPx)}px`;
  spacer.append(filler);
  return spacer;
}

interface MeasuredGap {
  pos: number;
  filler: number;
}

// WHY: Dev-only pagination telemetry (never shipped to prod builds): counts
// schedules/recomputes/dispatches plus the last pass shape, so a stuck
// endless page can be bisected from the console without guessing.
interface PaginationPassRecord {
  at: number;
  blocks: number;
  breaks: number;
  tail: number | null;
  heightPx: number;
  dispatched: boolean;
  /** Wall time of measure+plan+dispatch in ms — flags a slow machine. */
  durMs: number;
}

/** One pagination pause worth remembering (short ones are noise). */
interface CompositionPauseRecord {
  /** When the deferral streak started. */
  at: number;
  /** How long pagination stayed paused, in ms. */
  pauseMs: number;
  /** True when the stuck cap forced a pass through anyway. */
  forced: boolean;
}

interface PaginationDebug {
  schedules: number;
  recomputes: number;
  dispatches: number;
  verifyRepairs: number;
  lastPass: {
    at: number;
    blocks: number;
    breaks: number;
    tail: number | null;
    heightPx: number;
    domSpacers: number;
  } | null;
  /** Rolling history so a fault can be diagnosed AFTER the fact. */
  history: PaginationPassRecord[];
  /** Long pagination pauses (the only seconds-scale stall mechanism). */
  compositionPauses: CompositionPauseRecord[];
}

/** Ring-buffer cap — enough to cover a minutes-long bad spell. */
const DEBUG_HISTORY_LIMIT = 25;
/** Pauses shorter than this are normal IME breathing room, not evidence. */
const PAUSE_LOG_THRESHOLD_MS = 100;

declare global {
  interface Window {
    __flyyesPaginationDebug?: PaginationDebug;
  }
}

function paginationDebug(): PaginationDebug | null {
  if (!import.meta.env.DEV) return null;
  if (!window.__flyyesPaginationDebug) {
    window.__flyyesPaginationDebug = {
      schedules: 0,
      recomputes: 0,
      dispatches: 0,
      verifyRepairs: 0,
      lastPass: null,
      history: [],
      compositionPauses: [],
    };
  }
  return window.__flyyesPaginationDebug;
}

function recordPass(
  debug: PaginationDebug,
  entry: { blocks: number; breaks: number; tail: number | null; heightPx: number; dispatched: boolean; durMs: number }
): void {
  debug.history.push({ at: Date.now(), ...entry });
  if (debug.history.length > DEBUG_HISTORY_LIMIT) {
    debug.history.splice(0, debug.history.length - DEBUG_HISTORY_LIMIT);
  }
}

// WHY: Module-level positions (not plugin state) because the v3 manual
// strategy re-renders from create() on updateDecorations(). Single-editor
// app, so one slot is enough — never grows, replaced wholesale each pass.
let measuredGaps: MeasuredGap[] = [];
let measuredTail: number | null = null;

export const PageBreakIndicators = Extension.create({
  name: "pageBreakIndicators",

  addDecorations() {
    return {
      update: "manual",
      create: ({ state }) => {
        // WHY: Guard against stale positions (doc switched or edited between
        // measure and paint) — out-of-range widgets must never render.
        const size = state.doc.content.size;
        const positioned: Decoration[] = [];
        for (const gap of measuredGaps) {
          if (gap.pos < 0 || gap.pos > size) continue;
          positioned.push(
            Decoration.Widget(gap.pos, () => buildSpacerElement(gap.filler), {
              side: 1,
              key: `page-sp-${gap.pos}-${Math.round(gap.filler)}`,
            })
          );
        }
        if (measuredTail !== null && measuredTail >= MIN_FILLER_PX) {
          positioned.push(
            Decoration.Widget(size, () => buildTailElement(measuredTail as number), {
              side: 1,
              key: `page-tail-${Math.round(measuredTail)}`,
            })
          );
        }
        return positioned;
      },
    };
  },
});

/** Clear stale positions (call on document switch before first recompute). */
export function resetGapPositions(): void {
  measuredGaps = [];
  measuredTail = null;
}

/**
 * Measure top-level blocks against the editor content box.
 * Skips spacer widgets but SUBTRACTS their heights so returned tops are
 * natural positions (stable across re-layouts, no feedback drift).
 */
function measureBlocks(editor: Editor): Array<{ pos: number; top: number; height: number; forceBreakAfter: boolean }> {
  const view = editor.view;
  const editorRect = view.dom.getBoundingClientRect();
  const blocks: Array<{ pos: number; top: number; height: number; forceBreakAfter: boolean }> = [];
  const childNodes = Array.from(view.dom.childNodes);
  let spacerAbove = 0;
  for (let index = 0; index < childNodes.length; index++) {
    const child = childNodes[index];
    if (!(child instanceof HTMLElement)) continue;
    if (child.classList.contains(PAGE_SPACER_CLASS)) {
      spacerAbove += child.offsetHeight;
      continue;
    }
    if (child.classList.contains(PAGE_GAP_STRIP_CLASS)) {
      // Legacy flat strip (pre-spacer builds still in DOM during upgrade).
      spacerAbove += child.offsetHeight;
      continue;
    }
    const pos = view.posAtDOM(view.dom, index);
    if (pos < 0) continue;
    const rect = child.getBoundingClientRect();
    blocks.push({
      pos,
      top: rect.top - editorRect.top - spacerAbove,
      height: rect.height,
      // WHY: Manual break marker — the HR node renders as the labeled page-break
      // badge (pageBreakExtension), so match the badge class; the bare-HR tag
      // check stays as a fallback (e.g. node view not yet mounted).
      forceBreakAfter: child.tagName === "HR" || child.classList.contains(PAGE_BREAK_MARKER_CLASS),
    });
  }
  return blocks;
}

function sameGaps(first: MeasuredGap[], second: MeasuredGap[]): boolean {
  return (
    first.length === second.length &&
    first.every((gap, index) => gap.pos === second[index].pos && Math.round(gap.filler) === Math.round(second[index].filler))
  );
}

let recomputeTimer: number | undefined;
let recomputeToken = 0;
let pendingFrame: number | undefined;
let pendingPass: { editor: Editor; pageContentHeightPx: number } | null = null;
/** Retry cadence while IME composition is active (pagination stays deferred). */
const COMPOSE_RETRY_MS = 50;
/**
 * Stuck-composition insurance. `view.composing` can get stuck true with no
 * matching compositionend (missed IME end on focus jumps, IME quirks) — every
 * pass would then defer forever and the doc stays endless with zero errors.
 * The deferral streak is wall-clocked from its first sighting: past this age
 * one pass goes through anyway. A single decoration refresh beats permanently
 * missing pages, and genuine compositions never last this long uninterrupted.
 */
const STUCK_COMPOSE_AFTER_MS = 2500;
let composeStreakSince: number | null = null;
/** Last sane page height — a corrupt/NaN height must never silently unpaginate. */
let lastGoodHeightPx = 0;

/**
 * Frame-paced pagination: every call only books one recompute on the next
 * animation frame (multiple keystrokes/resizes per frame coalesce into one
 * measure+plan pass), so page breaks track typing like Word instead of
 * snapping 400ms after you stop. The pass itself still refreshes decorations
 * only when positions/fillers changed (steady state dispatches nothing), and
 * huge docs still degrade gracefully. Safe to call on every transaction.
 */
export function scheduleGapRecompute(editor: Editor, pageContentHeightPx: number): void {
  if (editor.isDestroyed) return;
  const debug = paginationDebug();
  if (debug) debug.schedules++;
  // WHY: Never recompute mid-composition — IME state + decoration churn
  // breaks CJK input. The streak is wall-clocked (not counted) so timer
  // throttling can't stretch it; past STUCK_COMPOSE_AFTER_MS the flag is
  // treated as stuck and one pass goes through anyway (then the streak
  // restarts if the flag is still set afterwards).
  if (editor.view.composing) {
    const now = Date.now();
    if (composeStreakSince === null) composeStreakSince = now;
    if (now - composeStreakSince < STUCK_COMPOSE_AFTER_MS) {
      if (recomputeTimer !== undefined) {
        window.clearTimeout(recomputeTimer);
      }
      const token = recomputeToken;
      const retryEditor = editor;
      const retryHeight = pageContentHeightPx;
      recomputeTimer = window.setTimeout(() => {
        if (token !== recomputeToken) return;
        scheduleGapRecompute(retryEditor, retryHeight);
      }, COMPOSE_RETRY_MS);
      return;
    }
  }
  // WHY: Reset here (not only on success) — a forced or clean attempt ends
  // the streak; it re-arms only if composition is still genuinely stuck after.
  // Long streaks are logged: they are the ONLY seconds-scale stall mechanism,
  // so this record (not just completed passes) is what convicts the next
  // grow-then-snap episode.
  if (debug && composeStreakSince !== null) {
    const pauseMs = Date.now() - composeStreakSince;
    if (pauseMs >= PAUSE_LOG_THRESHOLD_MS) {
      debug.compositionPauses.push({ at: composeStreakSince, pauseMs, forced: editor.view.composing });
      if (debug.compositionPauses.length > DEBUG_HISTORY_LIMIT) {
        debug.compositionPauses.splice(0, debug.compositionPauses.length - DEBUG_HISTORY_LIMIT);
      }
    }
  }
  composeStreakSince = null;
  pendingPass = { editor, pageContentHeightPx };
  if (pendingFrame !== undefined) return;
  const token = recomputeToken;
  pendingFrame = window.requestAnimationFrame(() => {
    pendingFrame = undefined;
    if (token !== recomputeToken) return;
    const pass = pendingPass;
    pendingPass = null;
    if (!pass || pass.editor.isDestroyed) return;
    // WHY: No composing check here on purpose — the schedule-time gate above
    // (plus the stuck cap) already decided; re-checking would let a stuck flag
    // defeat the cap one frame later.
    recomputeGapsNow(pass.editor, pass.pageContentHeightPx);
  });
}

/**
 * Synchronous twin of the frame-paced pass (shares the same body): cancels
 * any pending frame/retry and recomputes immediately. Used by beforeprint so
 * the printed page breaks are never one frame stale. Still skips
 * mid-composition (re-arms instead) to protect IME.
 */
export function flushGapRecompute(editor: Editor, pageContentHeightPx: number): void {
  recomputeToken++;
  if (recomputeTimer !== undefined) {
    window.clearTimeout(recomputeTimer);
    recomputeTimer = undefined;
  }
  if (pendingFrame !== undefined) {
    window.cancelAnimationFrame(pendingFrame);
    pendingFrame = undefined;
  }
  pendingPass = null;
  if (editor.isDestroyed) return;
  if (editor.view.composing) {
    scheduleGapRecompute(editor, pageContentHeightPx);
    return;
  }
  recomputeGapsNow(editor, pageContentHeightPx);
}

function recomputeGapsNow(editor: Editor, pageContentHeightPx: number): void {
    const debug = paginationDebug();
    if (debug) debug.recomputes++;
    // WHY: A corrupt height (NaN/zero from a bad zoom or preset read) must
    // never silently unpaginate the doc — fall back to the last sane value.
    let heightPx = pageContentHeightPx;
    if (!Number.isFinite(heightPx) || heightPx <= 0) {
      if (!Number.isFinite(lastGoodHeightPx) || lastGoodHeightPx <= 0) return;
      heightPx = lastGoodHeightPx;
    } else {
      lastGoodHeightPx = heightPx;
    }
    if (editor.view.dom.childNodes.length > MAX_MEASURED_BLOCKS) {
      // WHY: Graceful degradation for huge docs — gaps resume automatically
      // once the document shrinks below the cap.
      if (measuredGaps.length > 0 || measuredTail !== null) {
        measuredGaps = [];
        measuredTail = null;
        editor.commands.updateDecorations("pageBreakIndicators");
        if (debug) debug.dispatches++;
      }
      return;
    }
    const t0 = debug ? performance.now() : 0;
    const blocks = measureBlocks(editor);
    const plans = planPageBreaksWithFiller(blocks, heightPx);
    const nextGaps: MeasuredGap[] = plans
      .map((plan) => {
        const target = blocks[plan.afterIndex + 1];
        if (!target) return null;
        return { pos: target.pos, filler: plan.fillerHeightPx };
      })
      .filter((gap): gap is MeasuredGap => gap !== null);
    // Tail only matters past page one (single short page is already covered
    // by the .word-page min-height; adding filler there would overshoot A4).
    const tailRaw = planTailFiller(blocks, heightPx, plans);
    const nextTail = plans.length > 0 && tailRaw >= MIN_FILLER_PX ? tailRaw : null;
    if (sameGaps(nextGaps, measuredGaps) && (measuredTail ?? null) === nextTail) {
      if (debug) {
        debug.lastPass = {
          at: Date.now(),
          blocks: blocks.length,
          breaks: nextGaps.length,
          tail: nextTail,
          heightPx,
          domSpacers: countDomSpacers(editor),
        };
        recordPass(debug, {
          blocks: blocks.length,
          breaks: nextGaps.length,
          tail: nextTail,
          heightPx,
          dispatched: false,
          durMs: Math.round((performance.now() - t0) * 10) / 10,
        });
      }
      return;
    }
    measuredGaps = nextGaps;
    measuredTail = nextTail;
    editor.commands.updateDecorations("pageBreakIndicators");
    if (debug) {
      debug.dispatches++;
      debug.lastPass = {
        at: Date.now(),
        blocks: blocks.length,
        breaks: nextGaps.length,
        tail: nextTail,
        heightPx,
        domSpacers: countDomSpacers(editor),
      };
      recordPass(debug, {
        blocks: blocks.length,
        breaks: nextGaps.length,
        tail: nextTail,
        heightPx,
        dispatched: true,
        durMs: Math.round((performance.now() - t0) * 10) / 10,
      });
    }
    verifySeamRender(editor, heightPx, 3);
}

function countDomSpacers(editor: Editor): number {
  let actual = 0;
  for (const child of Array.from(editor.view.dom.childNodes)) {
    if (child instanceof HTMLElement && child.classList.contains(PAGE_SPACER_CLASS)) actual++;
  }
  return actual;
}

/**
 * Self-heal for silent render misses: next frame, count the spacer elements
 * actually in the DOM and compare with the plan. On mismatch, re-measure
 * fresh (positions may have gone stale between measure and paint) and check
 * again — bounded so a persistently sick layout can never spin forever.
 * Costs one childNodes scan per changed pass; steady state pays nothing.
 */
function verifySeamRender(editor: Editor, pageContentHeightPx: number, attemptsLeft: number): void {
  if (attemptsLeft <= 0 || editor.isDestroyed) return;
  window.requestAnimationFrame(() => {
    if (editor.isDestroyed) return;
    const expected = measuredGaps.length + (measuredTail !== null ? 1 : 0);
    let actual = 0;
    for (const child of Array.from(editor.view.dom.childNodes)) {
      if (child instanceof HTMLElement && child.classList.contains(PAGE_SPACER_CLASS)) actual++;
    }
    if (actual === expected) return;
    const debug = paginationDebug();
    if (debug) debug.verifyRepairs++;
    recomputeGapsNow(editor, pageContentHeightPx);
    verifySeamRender(editor, pageContentHeightPx, attemptsLeft - 1);
  });
}

export function cancelGapRecompute(): void {
  recomputeToken++;
  if (recomputeTimer !== undefined) {
    window.clearTimeout(recomputeTimer);
    recomputeTimer = undefined;
  }
  if (pendingFrame !== undefined) {
    window.cancelAnimationFrame(pendingFrame);
    pendingFrame = undefined;
  }
  pendingPass = null;
}
