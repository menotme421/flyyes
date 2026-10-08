// WHY: Minimal app-wide toasts on Carbon ToastNotification (replaces sonner).
// A plain pub/sub module so non-React services (export) can fire toasts;
// ToastHost (below in ToastHost.tsx) renders them. At most 4 stack up,
// each auto-dismisses after 6s (Carbon's timeout hides it, the timer here
// drops it from state even if onClose ever stops firing).

export type ToastKind = "error" | "info" | "success" | "warning";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
}

type ToastListener = (toasts: ToastItem[]) => void;

let nextToastId = 1;
let activeToasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit(): void {
  const snapshot = [...activeToasts];
  for (const listener of listeners) listener(snapshot);
}

function pushToast(kind: ToastKind, title: string): void {
  const item: ToastItem = { id: nextToastId++, kind, title };
  activeToasts = [...activeToasts.slice(-3), item];
  emit();
  const timer = setTimeout(() => dismissToast(item.id), 6500);
  timers.set(item.id, timer);
}

export function dismissToast(id: number): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  if (!activeToasts.some((item) => item.id === id)) return;
  activeToasts = activeToasts.filter((item) => item.id !== id);
  emit();
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  listener([...activeToasts]);
  return () => {
    listeners.delete(listener);
  };
}

// WHY: Same call shape as the old sonner import (toast.error(message)) so
// call sites barely change.
export const toast = {
  error: (message: string): void => pushToast("error", message),
  warning: (message: string): void => pushToast("warning", message),
  success: (message: string): void => pushToast("success", message),
  info: (message: string): void => pushToast("info", message),
};
