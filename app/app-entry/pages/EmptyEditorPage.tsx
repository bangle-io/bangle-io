import React from 'react';
import { Link } from 'react-router-dom';

import { useActionContext } from '@bangle.io/action-context';
import { ButtonIcon, ChevronDownIcon, Page } from '@bangle.io/ui-components';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { resolvePath } from '@bangle.io/ws-path';

const MAX_ENTRIES = 32;

export function EmptyEditorPage() {
  const { wsName, recentWsPaths = [], noteWsPaths } = useWorkspaceContext();
  const { dispatchAction } = useActionContext();
  const paths = Array.from(
    new Set([...recentWsPaths, ...(noteWsPaths || [])].slice(0, MAX_ENTRIES)),
  );
  return (
    <Page className="">
      <div className="flex flex-row">
        <h1 className="mr-1 text-3xl sm:text-2xl lg:text-3xl">{wsName}</h1>
        <ButtonIcon
          hint="Switch workspace"
          onClick={() => {
            dispatchAction({
              name: 'action::bangle-io-core-palettes:TOGGLE_WORKSPACE_PALETTE',
            });
          }}
          className="text-xs rounded-xl"
        >
          <ChevronDownIcon className="w-5 h-5" />
        </ButtonIcon>
      </div>
      {paths.length != 0 && (
        <>
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
        </>
      )}
      {paths.length !== 0 && (
        <button
          onClick={() => {
            dispatchAction({
              name: 'action::bangle-io-core-actions:NEW_NOTE_ACTION',
            });
          }}
          className="flex-none w-full px-6 py-3 mt-6 mb-3 ml-3 text-lg font-semibold leading-6 text-white transition-colors duration-200 bg-gray-800 border border-transparent sm:w-auto hover:bg-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none"
        >
          Create a note
        </button>
      )}
    </Page>
  );
}
