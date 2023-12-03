import { useStore, useTrack } from '@nalanda/react';
import React, { useEffect } from 'react';
import { useParams } from 'wouter';

import { sliceWorkspace } from '@bangle.io/slice-workspace';
import { Workspace } from '@bangle.io/workspace';

export default function PageWsName() {
  const params = useParams();

  const wsName = params.wsName;
  const { currentWorkspace } = useTrack(sliceWorkspace);

  const [ws, setWs] = React.useState<Workspace>();

  const [items, setItems] = React.useState<string[]>([]);

  useEffect(() => {
    void currentWorkspace?.listFiles().then((items) => {
      setItems(items);
    });
  }, [currentWorkspace]);

  return (
    <div>
      <h1>{params.wsName}</h1>
      <p>Workspace content</p>
      {items.map((item) => {
        return <div key={item}>{item}</div>;
      })}
    </div>
  );
}
