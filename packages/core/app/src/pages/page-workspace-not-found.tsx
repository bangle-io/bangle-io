import { useCoreServices } from '@bangle.io/context';
import { parseUrlPath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React from 'react';
import { useParams } from 'wouter';

export function PageWorkspaceNotFound() {
  // const { wsName } = useParams();

  const coreServices = useCoreServices();

  const location = useAtomValue(coreServices.navigation.$location);

  const wsName = parseUrlPath.pageWsHome(location)?.wsName;

  return (
    <div>
      <h1>Workspace Not Found {wsName}</h1>
    </div>
  );
}
