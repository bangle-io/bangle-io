import React from 'react';
import { Link } from 'react-router-dom';

import { useActionContext } from '@bangle.io/action-context';
import { Button, TooltipWrapper } from '@bangle.io/ui-bangle-button';
import {
  ButtonIcon,
  CenteredBoxedPage,
  ChevronDownIcon,
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
        <Button
          ariaLabel={'Switch workspace'}
          tooltipPlacement="right"
          tooltip={<TooltipWrapper>Switch workspace</TooltipWrapper>}
          onPress={() => {
            dispatchAction({
              name: 'action::bangle-io-core-palettes:TOGGLE_WORKSPACE_PALETTE',
            });
          }}
        >
          <ChevronDownIcon className="w-5 h-5" />
        </Button>
        {/* <ButtonIcon
          hint="Switch workspace"
          onClick={() => {
            dispatchAction({
              name: 'action::bangle-io-core-palettes:TOGGLE_WORKSPACE_PALETTE',
            });
          }}
          className="text-xs rounded-xl"
        ></ButtonIcon> */}
      </div>

      {paths.length !== 0 ? (
        <RecentNotes paths={paths} />
      ) : (
        <div className="mb-3">You do not have any notes in this workspace</div>
      )}

      <button
        onClick={() => {
          dispatchAction({
            name: 'action::bangle-io-core-actions:NEW_NOTE_ACTION',
          });
        }}
        className="flex-none w-full px-6 py-3 font-semibold leading-6 text-white transition-colors duration-200 bg-gray-800 border border-transparent mb-3text-lg sm:w-auto hover:bg-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none"
      >
        Create a note
      </button>
    </CenteredBoxedPage>
  );
}
