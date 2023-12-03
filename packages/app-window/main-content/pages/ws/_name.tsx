import { ActionGroup, Flex, Item, Text } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import React, { useEffect, useMemo } from 'react';
import { useParams } from 'wouter';

import { sliceUI } from '@bangle.io/slice-ui';
import { sliceWorkspace } from '@bangle.io/slice-workspace';
import { FilesTable, MainContentWrapper } from '@bangle.io/ui';
import { resolvePath } from '@bangle.io/ws-path';

export default function PageWsName() {
  const params = useParams();

  const wsName = params.wsName;
  const { currentWorkspace } = useTrack(sliceWorkspace);
  const { widescreen } = useTrack(sliceUI);

  const [wsPaths, setWsPaths] = React.useState<string[]>();
  const [selectedWsKey, updateSelectedWsKey] = React.useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    void currentWorkspace?.listFiles().then((items) => {
      setWsPaths(items);
    });
  }, [currentWorkspace]);

  const items = React.useMemo(() => {
    return wsPaths?.map((wsPath) => {
      const res = resolvePath(wsPath);
      return res;
    });
  }, [wsPaths]);

  if (!wsName) {
    return null;
  }

  return (
    <MainContentWrapper>
      <Text UNSAFE_className="text-2xl">Files</Text>
      <FilesTable
        wsName={wsName}
        createNote={() => {}}
        goToWsPath={() => {}}
        selectedKey={selectedWsKey}
        updateSelectedKey={updateSelectedWsKey}
        widescreen={widescreen}
        wsPathsInfo={items}
      />
    </MainContentWrapper>
  );
}
