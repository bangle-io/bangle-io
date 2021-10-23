import { useActionContext } from 'action-context';
import React from 'react';
import { Link } from 'react-router-dom';
import { useWorkspaceContext } from 'workspace-context';
import { resolvePath } from 'ws-path';

export function EmptyEditorPage() {
  const { wsName, recentWsPaths = [], noteWsPaths } = useWorkspaceContext();
  const { dispatchAction } = useActionContext();
  return (
    <>
      <h3 className="text-xl leading-none sm:text-2xl lg:text-3xl">
        Recently opened files in "{wsName}"
      </h3>
      <ul className="my-2 list-disc list-inside">
        {Array.from([...recentWsPaths, ...(noteWsPaths || [])].slice(0, 5)).map(
          (r, i) => {
            return (
              <li key={i}>
                <Link
                  to={resolvePath(r).locationPath}
                  className="hover:underline"
                >
                  {resolvePath(r).filePath}
                </Link>
              </li>
            );
          },
        )}
      </ul>
      <button
        onClick={() => {
          dispatchAction({
            name: '@action/core-palettes/TOGGLE_NOTES_PALETTE',
          });
        }}
        className="flex-none w-full px-6 py-3 mt-6 text-lg font-semibold leading-6 text-white transition-colors duration-200 bg-gray-800 border border-transparent sm:w-auto hover:bg-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none"
      >
        Open a note
      </button>
      <button
        onClick={() => {
          dispatchAction({
            name: '@action/core-actions/NEW_NOTE_ACTION',
          });
        }}
        className="flex-none w-full px-6 py-3 mt-6 ml-3 text-lg font-semibold leading-6 text-white transition-colors duration-200 bg-gray-800 border border-transparent sm:w-auto hover:bg-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none"
      >
        Create a note
      </button>
    </>
  );
}
