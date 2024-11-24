import { useCoreServices } from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';
import { pathnameToWsPath } from '@bangle.io/ws-path';
import React from 'react';
import { useParams } from 'wouter';

export function PageWsHome() {
  const coreServices = useCoreServices();
  const { wsName } = pathnameToWsPath(coreServices.navigation.pathname);

  return <div>{wsName && <div>hello workspace = {wsName}</div>}</div>;
}
