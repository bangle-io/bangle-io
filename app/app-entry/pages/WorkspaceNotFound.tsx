import React from 'react';
import { useParams } from 'react-router-dom';

import { useActionContext } from '@bangle.io/action-context';
import { Page } from '@bangle.io/ui-components';

export function WorkspaceNotFound({}) {
  const { wsName } = useParams();
  const { dispatchAction } = useActionContext();

  return (
    <Page>
      <h3 className="mb-8 text-xl font-bold leading-none sm:text-3xl lg:text-3xl">
        🕵️‍♀️‍ Workspace "{wsName}" not found
      </h3>
      <span className="flex-shrink mb-10 text-lg font-semibold sm:leading-10 sm:mb-1">
        If this is a mistake please create a bug report at{' '}
        <a
          target="_blank"
          rel="noreferrer"
          className="font-extrabold text-gray-700 hover:underline"
          href="https://github.com/bangle-io/bangle-io-issues/issues/new"
        >
          Github
        </a>
      </span>
      <button
        onClick={() => {
          dispatchAction({
            name: 'action::bangle-io-core-palettes:TOGGLE_WORKSPACE_PALETTE',
          });
        }}
        className="flex-none w-full px-6 py-3 mt-6 ml-3 text-lg font-semibold leading-6 text-white transition-colors duration-200 bg-gray-800 border border-transparent sm:w-auto hover:bg-gray-600 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none"
      >
        Open another workspace
      </button>
    </Page>
  );
}
