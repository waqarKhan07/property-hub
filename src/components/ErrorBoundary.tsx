import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("RentHub crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container-app flex min-h-dvh flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <svg
              aria-hidden="true"
              viewBox="0 0 64 64"
              className="h-7 w-7"
              fill="none"
            >
              <path d="M32 12 10 32h6v20h12V40h8v12h12V32h6z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink-900">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-ink-500">
            An unexpected error occurred. Try again, or go home if the problem persists.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Go home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}