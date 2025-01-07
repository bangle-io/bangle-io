import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { NoticeView, Section } from '../components';

export function PageWsPathNotFound() {
  return (
    <Section>
      <NoticeView title="Path Not Found" description={<FunMissing />} />
    </Section>
  );
}
