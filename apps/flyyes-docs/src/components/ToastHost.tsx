import { useEffect, useState } from "react";
import { ToastNotification } from "@carbon/react";
import { dismissToast, subscribeToasts, type ToastItem } from "./toast";

// WHY: Fixed bottom-right stack (the old sonner position) so existing
// "watch for the toast" habits keep working.
// FUTURE: carbon-theme — ToastHost + toast.ts move together as the shared
// brand notifier (no docs logic here).
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((item) => (
        <ToastNotification
          key={item.id}
          kind={item.kind}
          title={item.title}
          timeout={6000}
          onCloseButtonClick={() => dismissToast(item.id)}
          onClose={() => dismissToast(item.id)}
        />
      ))}
    </div>
  );
}
