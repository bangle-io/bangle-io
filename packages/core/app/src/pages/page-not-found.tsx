import { getGithubUrl } from '@bangle.io/base-utils';
import { useCoreServices, useLogger } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { AlertCircle } from 'lucide-react';
import React from 'react';
import { NoticeView } from '../components/notice-view';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { PageSection } from '../components/page-section';

export function PageNotFound() {
  const coreServices = useCoreServices();
  const logger = useLogger();

  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <PageSection>
          <NoticeView
            title="Page Not Found"
            description={<FunMissing />}
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
                label: 'Go to Welcome Screen',
                onClick: () => coreServices.navigation.goHome(),
              },
              {
                label: 'Report Issue',
                variant: 'outline',
                onClick: () => {
                  window.open(
                    getGithubUrl(new Error('404 Page Not Found'), logger),
                    '_blank',
                  );
                },
              },
            ]}
          />
        </PageSection>
      </PageMainContentWrapper>
    </>
  );
}
