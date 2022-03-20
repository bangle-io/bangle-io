import React from 'react';

export class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }
  state: { hasError: boolean; error: any } = {
    hasError: false,
    error: undefined,
  };

  componentDidCatch(error: Error, errorInfo: any) {
    // You can also log the error to an error reporting service
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{}} className="w-full p-4 ">
          <div className="w-full p-4 rounded-md bangle-error-boundary">
            <div className="w-full text-5xl text-center">🤕</div>

            <h1 className="w-full my-4 text-center">Something went wrong!</h1>

            <div className="w-full text-sm text-center">
              Help improve Bangle.io by reporting this on{' '}
              <a
                target="_blank"
                rel="noreferrer"
                className="font-extrabold underline"
                href="https://github.com/bangle-io/bangle-io/issues/new"
              >
                Github
              </a>
              <div className="w-full text-sm italic text-center">
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
