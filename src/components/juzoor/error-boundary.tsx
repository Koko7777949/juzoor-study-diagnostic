"use client";

import * as React from "react";
import { Sprout, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback render function. If not provided, a default UI is shown. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

/**
 * Top-level error boundary for the Juzoor app.
 *
 * Catches render-time errors in any child component and shows a calm,
 * Arabic-language fallback screen with a "restart" button that wipes
 * the persisted Zustand store (since corrupted state is a common cause
 * of render crashes after a deploy or schema change).
 *
 * The fallback is intentionally NOT styled with the full app chrome —
 * it's a minimal centered card so it works even if globals.css failed
 * to load (unlikely but possible).
 */
export class JuzoorErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console for debugging (no telemetry / external reporting)
    if (typeof console !== "undefined") {
      console.error("[JuzoorErrorBoundary]", error, info.componentStack);
    }
  }

  handleReset = () => {
    // Wipe the persisted store so we don't re-crash on reload
    try {
      localStorage.removeItem("juzoor.session.v1");
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    // Force a full reload to start fresh
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error;
  onReset: () => void;
}) {
  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen flex flex-col items-center justify-center bg-app-bg text-app-text p-6"
    >
      <div className="max-w-md w-full flex flex-col items-center text-center gap-4">
        <div className="size-20 rounded-full bg-app-accent/30 flex items-center justify-center">
          <Sprout className="size-10 text-app-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-app-primary font-cairo">
          حصلت حاجة مش متوقعة
        </h1>
        <p className="text-sm text-app-secondary leading-relaxed">
          التطبيق واجه خطأ. عشان نحل المشكلة، هنمسح بيانات الجلسة ونبدأ من جديد.
          لو المشكلة اتكررت، اتواصل مع الفريق.
        </p>

        <div className="w-full bg-app-muted border border-app-primary/15 rounded-xl p-3 text-start">
          <p className="text-xs font-bold text-app-secondary flex items-center gap-1.5 mb-1">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            تفاصيل الخطأ
          </p>
          <p className="text-xs text-app-secondary font-mono leading-relaxed break-words">
            {error.message || "Unknown error"}
          </p>
        </div>

        <Button
          type="button"
          className="touch-target h-12 bg-app-primary text-white hover:bg-app-primary/90 w-full"
          onClick={onReset}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          امسح البيانات وابدأ من جديد
        </Button>
      </div>
    </div>
  );
}
