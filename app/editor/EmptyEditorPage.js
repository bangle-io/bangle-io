import { useRecordRecentWsPaths } from 'app/hooks';
import { COMMAND_PALETTE, FILE_PALETTE } from 'app/Palette/index';
import React, { useContext, useEffect } from 'react';
import { UIManagerContext } from 'ui-context';
import { resolvePath, useGetCachedWorkspaceFiles } from 'workspace';
import { Link } from 'react-router-dom';

export function EmptyEditorPage() {
  const { dispatch } = useContext(UIManagerContext);
  let [files, refreshFiles] = useGetCachedWorkspaceFiles();
  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);
  const recentFiles = useRecordRecentWsPaths(files);
  console.log(recentFiles);
  return (
    <>
      <h3 className="text-xl sm:text-2xl lg:text-3xl leading-none">
        Recently opened files
      </h3>
      <ul className="list-inside list-disc my-2">
        {Array.from(new Set([...recentFiles, ...files.slice(0, 3)])).map(
          (r, i) => {
            console.log(r, resolvePath(r));
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
        Open a file
      </button>
      <button
        onClick={() => {
          dispatch({
            type: 'UI/CHANGE_PALETTE_TYPE',
            value: { type: COMMAND_PALETTE, initialQuery: 'new file' },
          });
        }}
        className="ml-3 w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-gray-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
      >
        Create a file
      </button>
    </>
  );
}
