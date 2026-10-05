import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

// WHY: shadcn Sonner wrapper — toast() replaces window.alert for
// validation errors (link/image/import), styled to the app theme.
// No next-themes dep: follows the OS color scheme via media query.

export function Toaster(rest: ToasterProps) {
  const darkMode = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return (
    <SonnerToaster
      theme={darkMode ? "dark" : "light"}
      position="bottom-center"
      toastOptions={{
        style: {
          background: "var(--background)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
        },
      }}
      {...rest}
    />
  );
}
