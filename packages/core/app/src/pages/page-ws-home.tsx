import { useCoreServices } from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';
import { parseUrlPath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React from 'react';

export function PageWsHome() {
  const coreServices = useCoreServices();
  const wsName = useAtomValue(coreServices.navigation.$wsName);
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
