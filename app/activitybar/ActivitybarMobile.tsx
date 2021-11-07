import React, { useEffect } from 'react';

import { useActionContext } from '@bangle.io/action-context';
import { FileDocumentIcon } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';

import { ActivitybarButton } from './ActivitybarButton';

export function ActivitybarMobile({
  primaryWsPath,
  wsName,
}: {
  primaryWsPath?: string;
  wsName?: string;
}) {
  const { dispatchAction } = useActionContext();

  return (
    <div className="flex flex-row text-gray-100 align-center ml-3 activitybar">
      <div className="flex flex-col justify-center mr-2">
        <ActivitybarButton
          widescreen={false}
          onPress={() => {
            dispatchAction({
              name: 'action::bangle-io-core-palettes:TOGGLE_NOTES_PALETTE',
            });
          }}
          icon={<FileDocumentIcon className="w-5 h-5" />}
        />
      </div>
      <div className="flex flex-col justify-center ml-2">
        <span>
          {primaryWsPath
            ? resolvePath(primaryWsPath).fileName
            : wsName || 'bangle-io'}
        </span>
      </div>
    </div>
  );
}
