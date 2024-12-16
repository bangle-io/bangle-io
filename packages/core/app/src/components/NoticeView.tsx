import { Button } from '@bangle.io/ui-components';
import React from 'react';
import { EmptyStateIllustration } from './EmptyStateIllustration';
import { Section } from './section';
import { Actions, Header } from './welcome-shared';

interface NoticeViewProps {
  title: string;
  description?: React.ReactNode;
  illustration?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActions?: {
    label: string;
    variant?: 'default' | 'outline' | 'ghost';
    onClick: () => void;
  }[];
}

/**
 * avoid doing things that can throw errors here as this is used in error boundary
 */
export function NoticeView({
  title,
  description,
  illustration = <EmptyStateIllustration />,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActions,
}: NoticeViewProps) {
  return (
    <Section hasPadding>
      <Header title={title} illustration={illustration} />
      {description ? (
        <p className="mt-2 text-muted-foreground">{description}</p>
      ) : null}
      {primaryActionLabel && onPrimaryAction ? (
        <div className="mt-4">
          <Button onClick={onPrimaryAction}>{primaryActionLabel}</Button>
        </div>
      ) : null}
      {secondaryActions ? <Actions actions={secondaryActions} /> : null}
    </Section>
  );
}
