import { getGithubUrl } from '@bangle.io/base-utils';
import { useLogger } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { AlertCircle } from 'lucide-react';
import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { NoticeView } from './NoticeView';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const logger = useLogger();
  return (
    <ReactErrorBoundary
      fallbackRender={({ error }) => {
        return (
          <NoticeView
            title="Something went wrong"
            illustration={
              <div className="flex items-center justify-center">
                <AlertCircle
                  className="h-24 w-24 stroke-[1.5] stroke-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            }
            secondaryActions={[
              {
                label: 'Report',
                variant: 'outline',
                onClick: () => {
                  window.open(getGithubUrl(error, logger), '_blank');
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
