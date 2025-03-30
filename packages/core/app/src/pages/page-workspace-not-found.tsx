import { useCoreServices } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { FolderX } from 'lucide-react';
import React from 'react';
import { NoticeView } from '../components/notice-view';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { Section } from '../components/section';

export function PageWorkspaceNotFound() {
  const coreServices = useCoreServices();

  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <Section>
          <NoticeView
            title="Workspace Not Found"
            description={
              <>
                <p>
                  The workspace you're looking for doesn't exist or has been
                  deleted.
                </p>
                <FunMissing />
              </>
            }
            illustration={
              <div className="flex items-center justify-center">
                <FolderX
                  className="h-24 w-24 stroke-[1.5] stroke-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            }
            actions={[
              {
                label: 'Create Workspace',
                onClick: () =>
                  coreServices.commandDispatcher.dispatch(
                    'command::ui:create-workspace-dialog',
                    null,
                    'ui',
                  ),
              },
              {
                label: 'Switch Workspace',
                variant: 'outline',
                onClick: () =>
                  coreServices.commandDispatcher.dispatch(
                    'command::ui:switch-workspace',
                    null,
                    'ui',
                  ),
              },
            ]}
          />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
