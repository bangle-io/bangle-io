import { useCoreServices } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import React from 'react';
import {
  Actions,
  Header,
  ItemList,
  NoticeView,
  PageHeaderWrapper,
  PageMainContentWrapper,
  Section,
  getRelativeTimeOrNull,
  useGroupedWorkspaceNotes,
} from '../components';

const MAX_NOTES_TO_SHOW = 5;

/**
 * This is the home page for a given workspace.
 * It shows the recent notes, and actions to create a new note or switch workspace.
 */
export function PageWsHome() {
  const coreServices = useCoreServices();
  const currentWsName = useAtomValue(
    coreServices.workspaceState.$currentWsName,
  );
  const groups = useGroupedWorkspaceNotes();

  // Prepare recent notes list (just top MAX_NOTES_TO_SHOW from "all" sorted)
  const allNotes = React.useMemo(() => {
    const notes = [...(groups.all || [])];
    return notes
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, MAX_NOTES_TO_SHOW);
  }, [groups]);

  const notesWithTime = React.useMemo(() => {
    return allNotes.map((note) => ({
      label: note.fileName,
      href: note.href,
      relativeTime: note.timestamp
        ? getRelativeTimeOrNull(note.timestamp)
        : null,
    }));
  }, [allNotes]);

  const noItemsMessage = 'No notes found in this workspace.';

  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        {currentWsName ? (
          <Section hasPadding={false}>
            <Header title={`${currentWsName}`} />
            <ItemList
              heading="Recent notes"
              items={notesWithTime}
              emptyMessage={noItemsMessage}
              showViewMore={groups.all && groups.all.length > MAX_NOTES_TO_SHOW}
              onClickViewMore={() =>
                coreServices.commandDispatcher.dispatch(
                  'command::ui:toggle-omni-search',
                  { prefill: undefined },
                  'ui',
                )
              }
            />
            {(groups.isEmpty || notesWithTime.length > 0) && (
              <Actions
                actions={[
                  {
                    label: 'New Note',
                    onClick: () =>
                      coreServices.commandDispatcher.dispatch(
                        'command::ui:create-note-dialog',
                        { prefillName: undefined },
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
            )}
          </Section>
        ) : (
          <NoticeView
            title="Workspace not found"
            description={<FunMissing />}
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
        )}
      </PageMainContentWrapper>
    </>
  );
}
