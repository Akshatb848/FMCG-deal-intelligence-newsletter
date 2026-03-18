'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Production-grade error boundary.
 * Catches any rendering errors in children and shows a graceful fallback
 * instead of crashing the entire page.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production you'd send this to Sentry / Datadog etc.
    console.error(`[ErrorBoundary] ${this.props.label ?? 'Component'} crashed:`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl min-h-[140px] text-center"
          style={{
            background: 'rgba(244,63,94,0.04)',
            border: '1px solid rgba(244,63,94,0.15)',
          }}
        >
          <AlertTriangle className="w-6 h-6" style={{ color: '#f87171' }} />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {this.props.label ?? 'Component'} failed to render
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)',
              color: '#f87171',
            }}
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight wrapper for inline use — wraps a single chart/widget.
 */
export function SafeWidget({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return <ErrorBoundary label={label}>{children}</ErrorBoundary>;
}
