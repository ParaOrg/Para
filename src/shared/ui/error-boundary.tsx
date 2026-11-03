import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** What stands in for the page once something under it has thrown. */
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasFailed: boolean;
}

/**
 * Catches what throws while its page renders (a screen whose code could not be fetched, a bug),
 * and shows the page's own fallback instead of a blank screen. The one class component
 * (CLAUDE.md): React catches render errors only in a class's error methods.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasFailed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasFailed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('The page could not be shown.', error, info.componentStack);
  }

  override render() {
    return this.state.hasFailed ? this.props.fallback : this.props.children;
  }
}
