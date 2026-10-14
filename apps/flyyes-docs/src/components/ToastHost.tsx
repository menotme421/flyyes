import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { dismissToast, subscribeToasts, type ToastItem } from "./toast";

// WHY: Fixed bottom-right stack (the old sonner position) so existing
// "watch for the toast" habits keep working. toast.ts API unchanged —
// services keep calling toast.error(...) with zero changes.
// FUTURE: flyyes-ui — ToastHost + toast.ts move together as the shared
// brand notifier (no docs logic here).
const KIND_BAR: Record<ToastItem["kind"], string> = {
  error: "bg-support-error",
  success: "bg-support-success",
  warning: "bg-support-warning",
  info: "bg-support-info",
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role={item.kind === "error" ? "alert" : "status"}
          className="flex items-start gap-2 border bg-popover p-3 text-popover-foreground"
        >
          <span aria-hidden="true" className={`mt-0.5 h-4 w-1 shrink-0 ${KIND_BAR[item.kind]}`} />
          <p className="flex-1 text-sm">{item.title}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(item.id)}
            className="shrink-0 rounded-none p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
