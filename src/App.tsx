import { useEffect, useState } from "react";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { EditorPage } from "@/pages/EditorPage";
import { HomePage } from "@/pages/HomePage";

// WHY: No react-router (minimize dependencies). Two views cover the whole flow.
// Browser history is synced manually so the browser back/forward buttons move
// between list and editor — the in-app back button was removed for this reason.
type AppView = { name: "home" } | { name: "editor"; documentId: string };

interface HistoryState {
  view?: string;
  documentId?: string;
}

function App() {
  const [view, setView] = useState<AppView>({ name: "home" });

  // WHY: Register once. replaceState anchors the list as the history root;
  // popstate (browser back/forward) restores whichever view that entry holds.
  useEffect(() => {
    window.history.replaceState({ view: "home" } satisfies HistoryState, "");
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as HistoryState | null;
      if (state?.view === "editor" && typeof state.documentId === "string") {
        setView({ name: "editor", documentId: state.documentId });
      } else {
        setView({ name: "home" });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function openDocument(documentId: string): void {
    window.history.pushState({ view: "editor", documentId } satisfies HistoryState, "");
    setView({ name: "editor", documentId });
  }

  // WHY: history.back() (not setView) so the history stack stays in sync —
  // forward button then correctly re-opens the same document.
  function goBack(): void {
    window.history.back();
  }

  return (
    <AppErrorBoundary>
      {view.name === "home" ? (
        <HomePage onOpenDocument={openDocument} />
      ) : (
        <EditorPage
          key={view.documentId}
          documentId={view.documentId}
          onBack={goBack}
        />
      )}
      <Toaster />
    </AppErrorBoundary>
  );
}

export default App;
