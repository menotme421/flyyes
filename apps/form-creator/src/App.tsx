import { useEffect, useState } from "react";
import { Header, HeaderName, SkipToContent, Theme } from "@carbon/react";

// WHY: Same brand shell as flyyes-docs (dark g100 header, OS-following theme).
// FUTURE: carbon-theme — Theme wrapper + dark-mode hook + brand Header move
// to the shared package; this app keeps only its page content.
function App() {
  const prefersDark = usePrefersDarkMode();

  return (
    <Theme theme={prefersDark ? "g100" : "white"}>
      <div className="no-print">
        <Theme theme="g100">
          <Header aria-label="Flyyes Forms">
            <SkipToContent href="#main-content">Skip to main content</SkipToContent>
            <HeaderName prefix="" href="#" aria-label="Flyyes Forms">
              <span>Flyyes</span>
              <span className="cds--type-body-02">&nbsp;Forms</span>
            </HeaderName>
          </Header>
        </Theme>
      </div>
      <div id="main-content" className="shell-content">
        <main className="fly-page">
          <h1 className="cds--type-heading-03">Forms by link — $0 backend</h1>
          <p className="cds--type-body-01">
            Scaffold shell only. Next: builder → share link with form inside the
            URL → respondents fill locally → responses return by link, QR, or file.
            Local-first, no login.
          </p>
          <div className="fly-cards">
            <section className="fly-card">
              <h2 className="cds--type-heading-01">1. Create</h2>
              <p className="cds--type-body-compact-01">Form builder lives here.</p>
            </section>
            <section className="fly-card">
              <h2 className="cds--type-heading-01">2. Share</h2>
              <p className="cds--type-body-compact-01">Compressed form inside a URL.</p>
            </section>
            <section className="fly-card">
              <h2 className="cds--type-heading-01">3. Collect</h2>
              <p className="cds--type-body-compact-01">Link, QR, or file export.</p>
            </section>
          </div>
        </main>
      </div>
    </Theme>
  );
}

// WHY: Single OS-sync hook so light/dark flips live (no reload).
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
