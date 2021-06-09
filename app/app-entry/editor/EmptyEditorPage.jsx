import { COMMAND_PALETTE, FILE_PALETTE } from 'palettes/index';
import React, { useContext, useEffect } from 'react';
import { UIManagerContext } from 'ui-context';
import { resolvePath } from 'workspace/index';
import { Link } from 'react-router-dom';
import { useWorkspaceHooksContext } from 'workspace-hooks/index';

export function EmptyEditorPage() {
  const { dispatch } = useContext(UIManagerContext);
  const { noteWsPaths } = useWorkspaceHooksContext();

  const recentFiles = [];
  return (
    <>
      <h3 className="text-xl sm:text-2xl lg:text-3xl leading-none">
        Recently opened files
      </h3>
      <ul className="list-inside list-disc my-2">
        {Array.from(new Set([...recentFiles, ...noteWsPaths.slice(0, 3)])).map(
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
          dispatch({
            type: 'UI/CHANGE_PALETTE_TYPE',
            value: { type: FILE_PALETTE },
          });
        }}
        className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-gray-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
      >
        Open a note
      </button>
      <button
        onClick={() => {
          dispatch({
            type: 'UI/CHANGE_PALETTE_TYPE',
            value: { type: COMMAND_PALETTE, initialQuery: 'new note' },
          });
        }}
        className="ml-3 w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-gray-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
      >
        Create a note
      </button>
    </>
  );
}
