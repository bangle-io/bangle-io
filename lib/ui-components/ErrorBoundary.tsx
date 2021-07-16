import React from 'react';

export class ErrorBoundary extends React.Component {
  state: { hasError: boolean; error: any };

  constructor(props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{}} className="p-4 w-full ">
          <div className="w-full bangle-error-boundary rounded-md p-4">
            <div className="text-5xl text-center w-full">🤕</div>

            <h1 className="text-center w-full my-4">Something went wrong!</h1>

            <div className="text-center w-full text-sm">
              Help improve Bangle.io by reporting this on{' '}
              <a
                target="_blank"
                rel="noreferrer"
                className="underline font-extrabold"
                href="https://github.com/bangle-io/bangle-io-issues/issues/new"
              >
                Github
              </a>
              <div className="text-center w-full text-sm italic">
                Error:{' '}
                {this.state.error?.displayMessage ||
                  this.state.error?.message ||
                  this.state.error?.name}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
