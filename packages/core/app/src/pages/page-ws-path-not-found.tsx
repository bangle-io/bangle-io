import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { NoticeView } from '../components/NoticeView';
import { Section } from '../components/section';

export function PageWsPathNotFound() {
  return (
    <Section>
      <NoticeView title="Path Not Found" description={<FunMissing />} />
    </Section>
  );
}
