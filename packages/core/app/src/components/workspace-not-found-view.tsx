import { useCoreServices } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { Briefcase } from 'lucide-react';
import React from 'react';
import { NoticeView } from './notice-view';

/** Displays a notice indicating that the requested workspace could not be found. */
export function WorkspaceNotFoundView({ wsName }: { wsName?: string }) {
  const coreServices = useCoreServices();

  const handleGoHome = () => {
    coreServices.navigation.goHome();
  };

  return (
    <NoticeView
      title={t.app.workspaceNotFoundView.title}
      description={
        <>
          <p>
            {wsName
              ? t.app.workspaceNotFoundView.description({ wsName })
              : t.app.workspaceNotFoundView.genericDescription}
          </p>
          <FunMissing />
        </>
      }
      illustration={
        <div className="flex items-center justify-center">
          <Briefcase
            className="h-24 w-24 stroke-[1.5] stroke-muted-foreground"
            aria-hidden="true"
          />
        </div>
      }
      actions={[
        {
          label: t.app.workspaceNotFoundView.goHomeButton,
          onClick: handleGoHome,
        },
      ]}
    />
  );
}
