import React from 'react';
import { Link } from 'react-router-dom';

import { useActionContext } from '@bangle.io/action-context';
import {
  ButtonIcon,
  ChevronDownIcon,
  NewNoteIcon,
} from '@bangle.io/ui-components';
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
    <>
      <div className="b-bg-stronger-color px-2 py-4 mb-6 rounded-md">
        <div className="flex flex-row">
          <h1 className="sm:text-2xl lg:text-3xl mr-1 text-3xl">{wsName}</h1>
          <ButtonIcon
            hint="Switch workspace"
            onClick={() => {
              dispatchAction({
                name: 'action::@bangle.io/core-palettes:TOGGLE_WORKSPACE_PALETTE',
              });
            }}
            className="rounded-xl text-xs"
          >
            <ChevronDownIcon className="w-5 h-5" />
          </ButtonIcon>
        </div>

        {paths.length > 0 && (
          <>
            <div className="flex flex-row mt-6">
              <h3 className="text-l sm:text-xl lg:text-xl mr-1 leading-none">
                Recent notes
              </h3>
            </div>
            <ul className="my-2 ml-2 list-disc list-inside">
              {paths.map((r, i) => {
                return (
                  <li key={i}>
                    <Link
                      to={resolvePath(r).locationPath}
                      className="hover:underline py-1"
                    >
                      {resolvePath(r).filePath}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {paths.length === 0 && (
        <button
          onClick={() => {
            dispatchAction({
              name: 'action::@bangle.io/core-actions:NEW_NOTE_ACTION',
            });
          }}
          className="sm:w-auto hover:bg-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none flex-none w-full px-6 py-3 mt-6 ml-3 text-lg font-semibold leading-6 text-white transition-colors duration-200 bg-gray-800 border border-transparent"
        >
          Create a note
        </button>
      )}
    </>
  );
}
