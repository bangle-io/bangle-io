import { getGithubUrl } from '@bangle.io/base-utils';
import { useLogger } from '@bangle.io/context';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { NoticeView } from '../components/feedback/notice-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

export function PageFatalError() {
  const logger = useLogger();

  return (
    <>
      <AppHeader />
      <PageContentContainer>
        <ContentSection hasPadding>
          <NoticeView
            title={t.app.pageFatalError.title}
            description={t.app.pageFatalError.description}
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
                label: t.app.pageFatalError.reloadButton,
                onClick: () => window.location.reload(),
              },
              {
                label: t.app.pageFatalError.reportButton,
                variant: 'outline',
                onClick: () => {
                  // Log the error before opening GitHub link
                  const error = new Error('Fatal Error Page Triggered');
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
