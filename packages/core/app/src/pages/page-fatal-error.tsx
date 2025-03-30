import { getGithubUrl } from '@bangle.io/base-utils';
import { useCoreServices, useLogger } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { NoticeView } from '../components/notice-view';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { Section } from '../components/section';

export function PageFatalError() {
  const logger = useLogger();

  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <Section>
          <NoticeView
            title="Fatal Error"
            description="Something went seriously wrong. We apologize for the inconvenience."
            illustration={
              <div className="flex items-center justify-center">
                <AlertTriangle
                  className="h-24 w-24 stroke-[1.5] stroke-destructive"
                  aria-hidden="true"
                />
              </div>
            }
            actions={[
              {
                label: 'Reload App',
                onClick: () => window.location.reload(),
              },
              {
                label: 'Report Issue',
                variant: 'outline',
                onClick: () => {
                  window.open(
                    getGithubUrl(new Error('Fatal Error'), logger),
                    '_blank',
                  );
                },
              },
            ]}
          />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
