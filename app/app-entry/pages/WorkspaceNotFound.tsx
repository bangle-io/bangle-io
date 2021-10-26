import { useActionContext } from 'action-context';
import React from 'react';
import { useParams } from 'react-router-dom';

import { EditorWrapperUI } from '../components/EditorWrapperUI';

export function WorkspaceNotFound({}) {
  const { wsName } = useParams();
  const { dispatchAction } = useActionContext();

  return (
    <EditorWrapperUI>
      <div className="flex flex-col justify-center flex-grow">
        <h3 className="sm:text-3xl lg:text-3xl mb-8 text-xl font-bold leading-none">
          🕵️‍♀️‍ Workspace "{wsName}" not found
        </h3>
        <span className="sm:leading-10 sm:mb-1 flex-shrink mb-10 text-lg font-semibold">
          If this is a mistake please create a bug report at{' '}
          <a
            target="_blank"
            rel="noreferrer"
            className="hover:underline font-extrabold text-gray-700"
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
          className="sm:w-auto hover:bg-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none flex-none w-full px-6 py-3 mt-6 ml-3 text-lg font-semibold leading-6 text-white transition-colors duration-200 bg-gray-800 border border-transparent"
        >
          Open another workspace
        </button>
      </div>
    </EditorWrapperUI>
  );
}
