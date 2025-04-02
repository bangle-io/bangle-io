import { getGithubUrl } from '@bangle.io/base-utils';
import { useLogger } from '@bangle.io/context';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { ContentSection } from '../components/content-section';
import { NoticeView } from '../components/notice-view';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageFatalError() {
  const logger = useLogger();

  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <ContentSection>
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
                  window.open(
                    getGithubUrl(new Error('Fatal Error'), logger),
                    '_blank',
                  );
                },
              },
            ]}
          />
        </ContentSection>
      </PageMainContentWrapper>
    </>
  );
}
