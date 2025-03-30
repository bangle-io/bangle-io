import { useCoreServices } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { Briefcase } from 'lucide-react';
import React from 'react';
import { NoticeView } from './notice-view';

export function WorkspaceNotFoundView({ wsName }: { wsName?: string }) {
  const coreServices = useCoreServices();

  const handleGoHome = () => {
    coreServices.navigation.goHome();
  };

  return (
    <NoticeView
      title="Workspace Not Found"
      description={
        <>
          <p>
            {wsName
              ? `The workspace "${wsName}" doesn't exist or was renamed.`
              : `This workspace doesn't exist or was renamed.`}
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
          label: 'Go Home',
          onClick: handleGoHome,
        },
      ]}
    />
  );
}
