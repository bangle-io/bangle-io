import { useCoreServices } from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';
import { pathnameToWsPath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React from 'react';

export function PageWsHome() {
  const coreServices = useCoreServices();
  const { wsName } = pathnameToWsPath(coreServices.navigation.pathname);
  const { current } = useAtomValue(coreServices.navigation.$lifeCycle);

  return (
    <div>
      {wsName && (
        <div>
          {current} hello workspace = {wsName}
        </div>
      )}
    </div>
  );
}
