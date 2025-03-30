import { useCoreServices } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { FileX } from 'lucide-react';
import React from 'react';
import { NoticeView } from './notice-view';

/** Displays a notice indicating that the requested note could not be found. */
export function NoteNotFoundView() {
  const coreServices = useCoreServices();

  const handleNewNote = () => {
    coreServices.commandDispatcher.dispatch(
      'command::ui:create-note-dialog',
      { prefillName: undefined },
      'ui',
    );
  };

  const handleViewAllNotes = () => {
    coreServices.commandDispatcher.dispatch(
      'command::ui:toggle-all-files',
      { prefillInput: undefined },
      'ui',
    );
  };

  return (
    <NoticeView
      title="Note Not Found"
      description={
        <>
          <p>The note you're looking for doesn't exist or has been moved.</p>
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
          label: 'New Note',
          onClick: handleNewNote,
        },
        {
          label: 'View All Notes',
          variant: 'outline',
          onClick: handleViewAllNotes,
        },
      ]}
    />
  );
}
