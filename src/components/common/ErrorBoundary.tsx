/**
 * Global Error Boundary Component
 * Prevents UI crashes and provides meaningful error messages
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  toolName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      (window as any).errorTracker.log(error, {
        componentStack: errorInfo.componentStack,
        toolName: this.props.toolName,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="m-4 bg-red-950/20 border-red-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              {this.props.toolName ? `${this.props.toolName} Error` : 'Error'}
            </CardTitle>
            <CardDescription className="text-red-300">
              Something went wrong while rendering this tool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900/50 p-4 rounded border border-red-500/30">
              <p className="text-sm text-red-200 font-mono mb-2">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs text-gray-400 overflow-auto max-h-40">
                    {this.state.error?.stack}
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
              >
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-red-400/40 text-red-400 hover:bg-red-400/10"
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  toolName?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary toolName={toolName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
