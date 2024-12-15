import { Button } from '@bangle.io/ui-components';
import React from 'react';
import { EmptyStateIllustration } from './EmptyStateIllustration';

interface EmptyStateProps {
  title: string;
  message?: React.ReactNode;
  illustration?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  message,
  illustration = <EmptyStateIllustration />,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-8 text-center">
      <div className="mx-auto max-w-sm">
        {illustration ? (
          <div className="mb-4 flex justify-center">{illustration}</div>
        ) : null}
        <h1 className="font-semibold text-2xl">{title}</h1>
        {message ? (
          <p className="mt-2 text-muted-foreground">{message}</p>
        ) : null}
        {actionLabel && onAction ? (
          <div className="mt-4">
            <Button onClick={onAction}>{actionLabel}</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
