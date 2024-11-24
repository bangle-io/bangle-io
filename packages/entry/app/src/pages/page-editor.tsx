import { useCoreServices } from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';
import { pathnameToWsPath, resolvePath } from '@bangle.io/ws-path';
import React from 'react';

export function PageEditor() {
  const coreServices = useCoreServices();
  const { wsPath, wsName } = pathnameToWsPath(coreServices.navigation.pathname);

  if (!wsPath) {
    return <div>Invalid path</div>;
  }

  return (
    <div>
      {wsName && (
        <EditorComp
          wsPath={wsPath}
          readNote={async (wsPath) => {
            return coreServices.fileSystem.readFileAsText(wsPath);
          }}
          writeNote={async (wsPath, content) => {
            const { fileName } = resolvePath(wsPath);
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
