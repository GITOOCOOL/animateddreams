import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center font-sans">
          <div className="bg-red-950/30 border border-red-500/50 p-8 rounded-2xl max-w-2xl w-full backdrop-blur-md shadow-2xl">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-red-100 mb-2 uppercase tracking-widest">System Critical Failure</h1>
            <p className="text-red-300/80 mb-6">The neural interface encountered an unrecoverable rendering error.</p>
            
            <div className="bg-black/50 p-4 rounded-lg text-left text-xs font-mono text-red-400 overflow-auto max-h-64 mb-6 border border-red-900/50">
              <p className="font-bold mb-2">{this.state.error?.toString()}</p>
              <pre className="whitespace-pre-wrap opacity-70">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 mx-auto uppercase text-xs tracking-wider"
            >
              <RefreshCcw className="w-4 h-4" />
              Reboot System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
