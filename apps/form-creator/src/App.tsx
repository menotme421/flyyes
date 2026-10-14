import { useEffect, useState } from "react";
import { PageShell, applyTheme, readStoredTheme, type ThemePreference } from "@flyyes/ui";

// WHY: Scaffold shell only — same theme mechanism as flyyes-docs
// (ui tokens + .dark class, OS-following by default).
function App() {
  useFlyyesTheme();

  return (
    <PageShell>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:underline">
        Skip to main content
      </a>
      <main id="main-content" className="py-10">
        <h1 className="font-heading text-xl font-semibold">Forms by link — $0 backend</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scaffold shell only. Next: builder → share link with form inside the
          URL → respondents fill locally → responses return by link, QR, or file.
          Local-first, no login.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <section className="border bg-card p-4 text-card-foreground">
            <h2 className="text-sm font-semibold">1. Create</h2>
            <p className="mt-1 text-sm text-muted-foreground">Form builder lives here.</p>
          </section>
          <section className="border bg-card p-4 text-card-foreground">
            <h2 className="text-sm font-semibold">2. Share</h2>
            <p className="mt-1 text-sm text-muted-foreground">Compressed form inside a URL.</p>
          </section>
          <section className="border bg-card p-4 text-card-foreground">
            <h2 className="text-sm font-semibold">3. Collect</h2>
            <p className="mt-1 text-sm text-muted-foreground">Link, QR, or file export.</p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

// WHY: Stored preference (default "system") + live OS sync. Mirrors docs.
function useFlyyesTheme(): void {
  const [preference] = useState<ThemePreference>(() =>
    readStoredTheme()
  );

  useEffect(() => {
    applyTheme(preference);
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme(readStoredTheme());
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [preference]);
}

export default App;
