import { Component, ErrorInfo } from 'react';

type ErrorBoundaryState =
  | {
      hasError: true;
      error: Error;
    }
  | {
      hasError: false;
      error: null;
    };

type ErrorBoundaryProps = {
  fallback: React.ReactNode;
  children: React.ReactNode;
};
const initialState: ErrorBoundaryState = {
  hasError: false,
  error: null,
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = initialState;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log('error boundary', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
