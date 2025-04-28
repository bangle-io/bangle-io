import { getGithubUrl } from '@bangle.io/base-utils';
import { useCoreServices, useLogger } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { AlertCircle } from 'lucide-react';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { NoticeView } from '../components/feedback/notice-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

export function PageNotFound() {
  const coreServices = useCoreServices();
  const logger = useLogger();

  return (
    <>
      <AppHeader />
      <PageContentContainer>
        <ContentSection hasPadding>
          <NoticeView
            title={t.app.pageNotFound.title}
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
                label: t.app.pageNotFound.goHomeButton,
                onClick: () => coreServices.navigation.goHome(),
              },
              {
                label: t.app.pageNotFound.reportButton,
                variant: 'outline',
                onClick: () => {
                  const error = new Error(
                    `404 Page Not Found: ${window.location.href}`,
                  );
                  logger.error(error);
                  window.open(getGithubUrl(error, logger), '_blank');
                },
              },
            ]}
          />
        </ContentSection>
      </PageContentContainer>
    </>
  );
}
