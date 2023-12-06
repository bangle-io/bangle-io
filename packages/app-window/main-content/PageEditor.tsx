import { useTrack } from '@nalanda/react';
import React, { useCallback } from 'react';

import { EditorComp } from '@bangle.io/editor';
import { slicePage } from '@bangle.io/slice-page';
import { sliceWorkspace } from '@bangle.io/slice-workspace';
import { MainContentWrapper } from '@bangle.io/ui';
import { resolvePath } from '@bangle.io/ws-path';

export function PageEditor() {
  const { wsName, primaryWsPath } = useTrack(slicePage);
  const { workspace } = useTrack(sliceWorkspace);

  const readNote = useCallback(
    async (wsPath: string) => {
      return workspace?.readFileAsText(wsPath);
    },
    [workspace],
  );

  console.log({ wsName, primaryWsPath });

  if (!wsName || !primaryWsPath) {
    return null;
  }

  return (
    <MainContentWrapper>
      <EditorComp
        wsPath={primaryWsPath}
        readNote={readNote}
        writeNote={async (wsPath, content) => {
          const { fileName } = resolvePath(wsPath);
          void workspace?.createFile(
            wsPath,
            new File([content], fileName, {
              type: 'text/plain',
            }),
          );
        }}
      />
    </MainContentWrapper>
  );
}
