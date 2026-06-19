import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/errorReporter";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error);
    console.error("[ErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            color: "#374151",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#6B7280", marginBottom: "1rem" }}>
            An unexpected error occurred. The issue has been logged automatically.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: null })}
            style={{
              padding: "0.5rem 1.25rem",
              background: "#0F6E56",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
