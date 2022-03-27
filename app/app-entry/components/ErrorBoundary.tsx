import React from 'react';

import { initializeBangleStore } from '@bangle.io/bangle-store';
import { BaseError } from '@bangle.io/utils';

export class ErrorBoundary extends React.Component<{
  store: ReturnType<typeof initializeBangleStore>;
}> {
  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  state: { hasError: boolean; error: Error | undefined | BaseError } = {
    hasError: false,
    error: undefined,
  };

  componentDidCatch(error: Error) {
    (window as any).Sentry?.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="w-full p-4">
          <div className="w-full p-4 rounded-md b-ui-components_bangle-error-boundary">
            <div className="w-full text-5xl text-center">🤕</div>
            <h1 className="w-full my-4 text-center">Something went wrong!</h1>
            <div className="w-full text-sm text-center">
              Help improve Bangle.io by reporting this on{' '}
              <a
                target="_blank"
                rel="noreferrer noopener"
                className="font-extrabold underline"
                href="https://github.com/bangle-io/bangle-io/issues/new"
              >
                Github
              </a>
              <div className="w-full text-sm italic text-center">
                Error:{' '}
                {this.state.error?.name + ':' + this.state.error?.message}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
