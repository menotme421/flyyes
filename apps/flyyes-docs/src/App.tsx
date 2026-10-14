import { useEffect, useState } from "react";
import { TooltipProvider } from "@flyyes/ui";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
  type ThemePreference,
} from "@flyyes/ui";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { ToastHost } from "@/components/ToastHost";
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
  // WHY: Theme DOM (.dark class + colorScheme) syncs once here —
  // tokens and Tailwind dark: follow with no provider wrapper.
  useFlyyesTheme();

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
      <TooltipProvider>
        {/* WHY: No shell header — the list opens directly on content. */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:underline">
          Skip to main content
        </a>
        <div id="main-content">
          {view.name === "home" ? (
            <HomePage onOpenDocument={openDocument} />
          ) : (
            <EditorPage
              key={view.documentId}
              documentId={view.documentId}
              onBack={goBack}
            />
          )}
        </div>
        <ToastHost />
      </TooltipProvider>
    </AppErrorBoundary>
  );
}

// WHY: Preference (stored, default "system") + live OS sync. applyTheme writes
// .dark class + colorScheme. No second provider.
function useFlyyesTheme(): void {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    readStoredTheme()
  );

  useEffect(() => {
    applyTheme(preference);
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme(readStoredTheme());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        setPreference(readStoredTheme());
      }
    };
    query.addEventListener("change", handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      query.removeEventListener("change", handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [preference]);
}

export default App;
