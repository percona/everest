import { Component } from 'react';
import { ErrorContext } from './ErrorBoundaryProvider';

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
  static contextType = ErrorContext;
  declare context: React.ContextType<typeof ErrorContext>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = initialState;
  }

  componentDidCatch(error: Error) {
    this.context.updateError(true);
    this.context.updateErrorObject(error);
  }

  render() {
    if (this.context.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
