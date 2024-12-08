import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';
import { EditorToolbar } from '../components/editor-toolbar';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageWsHome() {
  const coreServices = useCoreServices();
  const wsName = useAtomValue(coreServices.navigation.$wsName);

  return (
    <>
      <PageHeaderWrapper>
        <EditorToolbar />
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        {wsName && <div>Get started</div>}
      </PageMainContentWrapper>
    </>
  );
}
