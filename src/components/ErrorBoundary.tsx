import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  resetKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState((s) => ({
      hasError: false,
      message: "",
      resetKey: s.resetKey + 1,
    }));
  };

  render() {
    if (!this.state.hasError) {
      return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          background: "#1a1a2e",
          color: "white",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 48 }}>⚠️</span>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Something went wrong</h1>
        <p style={{ opacity: 0.7, fontSize: 14 }}>{this.state.message}</p>
        <button
          type="button"
          onClick={this.handleRetry}
          style={{
            padding: "10px 24px",
            borderRadius: 999,
            border: "none",
            background: "var(--accent-primary)",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
