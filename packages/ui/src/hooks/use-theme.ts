export const THEME_STORAGE_KEY = "flyyes-theme";

export type ThemePreference = "white" | "g100" | "system";
export type ResolvedTheme = "white" | "g100";

export function getResolvedTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "g100"
      : "white";
  }
  return preference;
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = getResolvedTheme(preference);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "g100");
  root.style.colorScheme = resolved === "g100" ? "dark" : "light";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // ignore (private mode)
  }
  return resolved;
}

export function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "white" || stored === "g100" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore
  }
  return "system";
}
