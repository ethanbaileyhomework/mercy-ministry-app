import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Kiosk ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <AlertTriangle size={64} className="text-gold mb-6" />
          <h1 className="text-kiosk-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-kiosk-body text-white/60 mb-8 max-w-md">
            Don&apos;t worry — your data is safe. Tap below to return to the home screen.
          </p>
          <button
            onClick={this.handleReset}
            className="kiosk-button-primary px-12 py-5 flex items-center justify-center gap-3"
          >
            Return to Home
          </button>
          {this.state.error && (
            <p className="text-xs text-white/20 mt-6 max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
