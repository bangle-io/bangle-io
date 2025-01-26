import React from 'react';
import { EmptyStateIllustration } from './EmptyStateIllustration';
import { Section } from './section';
import { Actions, Header } from './welcome-shared';

interface NoticeViewProps {
  title: string;
  description?: React.ReactNode;
  illustration?: React.ReactNode;
  actions?: {
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
  actions,
}: NoticeViewProps) {
  return (
    <Section hasPadding>
      <Header title={title} illustration={illustration} />
      {description ? (
        <p className="mt-2 text-muted-foreground">{description}</p>
      ) : null}
      {actions ? <Actions actions={actions} /> : null}
    </Section>
  );
}
