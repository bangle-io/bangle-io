import { useActionContext } from 'action-context';
import React from 'react';
import { useParams } from 'react-router-dom';

import { EditorWrapperUI } from '../components/EditorWrapperUI';

export function WorkspaceNotFound({}) {
  const { wsName } = useParams();
  const { dispatchAction } = useActionContext();

  return (
    <EditorWrapperUI>
      <div className="flex flex-grow justify-center flex-col">
        <h3 className="text-xl sm:text-3xl lg:text-3xl leading-none font-bold  mb-8">
          🕵️‍♀️‍ Workspace "{wsName}" not found
        </h3>
        <span className="flex-shrink text-lg sm:leading-10 font-semibold mb-10 sm:mb-1">
          If this is a mistake please create a bug report at{' '}
          <a
            target="_blank"
            rel="noreferrer"
            className="text-gray-700 font-extrabold hover:underline"
            href="https://github.com/bangle-io/bangle-io-issues/issues/new"
          >
            Github
          </a>
        </span>
        <button
          onClick={() => {
            dispatchAction({
              name: '@action/core-palettes/TOGGLE_WORKSPACE_PALETTE',
            });
          }}
          className="ml-3 w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-gray-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
        >
          Open another workspace
        </button>
      </div>
    </EditorWrapperUI>
  );
}
