import * as React from "react";
import { logError } from "@/utils/appLogger";

// WHY: Centralized error boundary so one crash never blanks the whole app silently.
// Shows a safe message (no stack traces) per security rules.
interface ErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    logError("Unhandled UI error", {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please reload the page. Your documents are still saved in this browser.
          </p>
          <button
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
