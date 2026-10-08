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
        <div className="fly-page-xs">
          <h1 className="cds--type-heading-03">Something went wrong</h1>
          <p className="cds--type-body-01 fly-caption text-muted-foreground">
            Please reload the page. Your documents are still saved in this browser.
          </p>
          <button
            className="fly-error-button rounded-md bg-primary text-sm text-primary-foreground"
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
