import React from 'react';
import { Actions } from './actions';
import { EmptyStateIllustration } from './empty-state-illustration';
import { PageHeader } from './page-header';
import { Section } from './section';

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
      <PageHeader title={title} illustration={illustration} />
      {description ? (
        <p className="mt-2 text-muted-foreground">{description}</p>
      ) : null}
      {actions ? <Actions actions={actions} /> : null}
    </Section>
  );
}
