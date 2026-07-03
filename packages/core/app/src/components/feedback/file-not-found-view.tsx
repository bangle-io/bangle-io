import { useCoreServices } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { FileX } from 'lucide-react';
import React from 'react';
import { NoticeView } from './notice-view';

export function FileNotFoundView() {
  const coreServices = useCoreServices();

  const handleViewAllFiles = () => {
    coreServices.commandDispatcher.dispatch(
      'command::ui:toggle-all-files',
      { prefillInput: undefined },
      'ui',
    );
  };

  return (
    <NoticeView
      title={t.app.fileNotFoundView.title}
      description={
        <>
          {t.app.fileNotFoundView.description}
          <br />
          <FunMissing />
        </>
      }
      illustration={
        <div className="flex items-center justify-center">
          <FileX
            className="h-24 w-24 stroke-[1.5] stroke-muted-foreground"
            aria-hidden="true"
          />
        </div>
      }
      actions={[
        {
          label: t.app.fileNotFoundView.viewAllFilesButton,
          variant: 'outline',
          onClick: handleViewAllFiles,
        },
      ]}
    />
  );
}
