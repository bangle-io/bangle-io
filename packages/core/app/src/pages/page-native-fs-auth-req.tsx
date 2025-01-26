import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import {
  NoticeView,
  PageHeaderWrapper,
  PageMainContentWrapper,
  Section,
} from '../components';

export function PageNativeFsAuthReq() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>We were unable to get permission for </h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <Section>
          <NoticeView
            title="Authentication Required, Please allow access to continue"
            description={<FunMissing />}
            actions={[
              {
                label: 'Authorize',
                onClick: () => window.location.reload(),
              },
            ]}
          />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
