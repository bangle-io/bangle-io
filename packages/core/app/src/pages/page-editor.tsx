import { useCoreServices } from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';
import { parseUrlPath, resolvePath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React from 'react';
import { useLocation } from 'wouter';

export function PageEditor() {
  const coreServices = useCoreServices();

  const wsPath = useAtomValue(coreServices.navigation.$wsPath);
  const wsName = useAtomValue(coreServices.navigation.$wsName);

  if (!wsPath) {
    return <div>Invalid path</div>;
  }

  return (
    <div>
      {wsPath && (
        <EditorComp
          wsPath={wsPath}
          readNote={async (wsPath) => {
            return coreServices.fileSystem.readFileAsText(wsPath);
          }}
          writeNote={async (wsPath, content) => {
            const fileName = resolvePath(wsPath)?.fileName || '';

            void coreServices.fileSystem.createFile(
              wsPath,
              new File([content], fileName, {
                type: 'text/plain',
              }),
            );
          }}
        />
      )}
    </div>
  );
}
