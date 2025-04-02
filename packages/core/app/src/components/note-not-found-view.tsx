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
      title={t.app.noteNotFoundView.title}
      description={
        <>
          <p>{t.app.noteNotFoundView.description}</p>
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
          label: t.app.pageWsHome.newNoteButton,
          onClick: handleNewNote,
        },
        {
          label: t.app.noteNotFoundView.viewAllNotesButton,
          variant: 'outline',
          onClick: handleViewAllNotes,
        },
      ]}
    />
  );
}
