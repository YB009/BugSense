import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { BugSense } from '../core/BugSense';

export interface BugSenseErrorBoundaryProps {
  bugsense: BugSense;
  children: ReactNode;
  fallback?: ReactNode;
}

interface BugSenseErrorBoundaryState {
  hasError: boolean;
}

export class BugSenseErrorBoundary extends Component<
  BugSenseErrorBoundaryProps,
  BugSenseErrorBoundaryState
> {
  state: BugSenseErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void this.props.bugsense.captureException(error, {
      metadata: {
        componentStack: errorInfo.componentStack,
      },
      tags: {
        source: 'react-error-boundary',
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}
