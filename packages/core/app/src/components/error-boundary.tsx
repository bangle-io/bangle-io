import { getGithubUrl } from '@bangle.io/base-utils';
import { useLogger } from '@bangle.io/context';
import { AlertCircle } from 'lucide-react';
import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { NoticeView } from './notice-view';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

/** Catches JavaScript errors anywhere in its child component tree and displays a fallback UI. */
export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const logger = useLogger();
  return (
    <ReactErrorBoundary
      fallbackRender={({ error }) => {
        const reportError = toError(error);

        return (
          <NoticeView
            title={t.app.common.somethingWentWrong}
            illustration={
              <div className="flex items-center justify-center">
                <AlertCircle
                  className="h-24 w-24 stroke-[1.5] stroke-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            }
            actions={[
              {
                label: t.app.common.report,
                variant: 'outline',
                onClick: () => {
                  window.open(getGithubUrl(reportError, logger), '_blank');
                },
              },
            ]}
          />
        );
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
