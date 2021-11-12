import React from 'react';
import { Link } from 'react-router-dom';

import { useActionContext } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_NEW_NOTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import { ActionButton, TooltipWrapper } from '@bangle.io/ui-bangle-button';
import { ButtonContent } from '@bangle.io/ui-bangle-button/ButtonContent';
import {
  CenteredBoxedPage,
  ChevronDownIcon,
  NewNoteIcon,
} from '@bangle.io/ui-components';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { resolvePath } from '@bangle.io/ws-path';

const MAX_ENTRIES = 8;

function RecentNotes({ paths }: { paths: string[] }) {
  return (
    <div className="mb-3">
      <div className="flex flex-row mt-6">
        <h3 className="mr-1 leading-none text-l sm:text-xl lg:text-xl">
          Recent notes
        </h3>
      </div>
      <ul className="my-2 ml-2 list-disc list-inside">
        {paths.map((r, i) => {
          return (
            <li key={i}>
              <Link
                to={resolvePath(r).locationPath}
                className="py-1 hover:underline"
              >
                {resolvePath(r).filePath}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function EmptyEditorPage() {
  const { wsName, recentWsPaths = [], noteWsPaths } = useWorkspaceContext();
  const { dispatchAction } = useActionContext();
  const paths = Array.from(
    new Set([...recentWsPaths, ...(noteWsPaths || [])].slice(0, MAX_ENTRIES)),
  );
  return (
    <CenteredBoxedPage className="">
      <div className="flex flex-row mb-3">
        <h1 className="mr-1 text-3xl sm:text-2xl lg:text-3xl">{wsName}</h1>
        <ActionButton
          isQuiet="hoverBg"
          ariaLabel={'Switch workspace'}
          tooltipPlacement="right"
          tooltip={<TooltipWrapper>Switch workspace</TooltipWrapper>}
          onPress={() => {
            dispatchAction({
              name: CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
            });
          }}
        >
          <ChevronDownIcon className="w-5 h-5" />
        </ActionButton>
      </div>

      {paths.length !== 0 ? (
        <RecentNotes paths={paths} />
      ) : (
        <div className="mb-3">You do not have any notes in this workspace</div>
      )}

      <ActionButton
        ariaLabel="create note"
        onPress={() => {
          dispatchAction({
            name: CORE_ACTIONS_NEW_NOTE,
          });
        }}
      >
        <ButtonContent
          text="Create note"
          icon={<NewNoteIcon />}
        ></ButtonContent>
      </ActionButton>
    </CenteredBoxedPage>
  );
}
