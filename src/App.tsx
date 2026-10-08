import { useEffect, useState } from "react";
import { Header, HeaderName, SkipToContent, Theme } from "@carbon/react";
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
  // WHY: Carbon White theme by default, g100 when the OS asks for dark —
  // same OS-following behavior the app had with the shadcn tokens.
  const prefersDark = usePrefersDarkMode();

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
      <Theme theme={prefersDark ? "g100" : "white"}>
        {/* WHY: The shell header lives only on the home page — in the editor
            it ate 48px and pushed every sticky bar (and tall centered modals)
            down with it. Home keeps the offset; the editor starts at y=0. */}
        {view.name === "home" ? (
          <div className="no-print">
            <Theme theme="g100">
              <Header aria-label="Flyyes Docs">
                <SkipToContent href="#main-content">Skip to main content</SkipToContent>
                <HeaderName
                  prefix="Flyyes"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (view.name !== "home") goBack();
                  }}
                >
                  Docs
                </HeaderName>
              </Header>
            </Theme>
          </div>
        ) : null}
        <div id="main-content" className={view.name === "home" ? "shell-content" : undefined}>
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
      </Theme>
    </AppErrorBoundary>
  );
}

// WHY: Single OS-sync hook so light/dark flips live (no reload) and every
// Carbon component under Theme re-tokens automatically.
function usePrefersDarkMode(): boolean {
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return prefersDark;
}

export default App;
