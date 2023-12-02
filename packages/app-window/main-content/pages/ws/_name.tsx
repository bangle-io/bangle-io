import { useStore } from '@nalanda/react';
import React, { useEffect } from 'react';
import { useParams } from 'wouter';

import { getEternalVarsWindow } from '@bangle.io/lib-common';
import { Workspace } from '@bangle.io/workspace';

export default function PageWsName() {
  const params = useParams();

  const store = useStore();
  const eternalVars = getEternalVarsWindow(store);

  const wsName = params.wsName;

  const [ws, setWs] = React.useState<Workspace>();

  const [items, setItems] = React.useState<string[]>([]);

  useEffect(() => {
    if (!wsName) {
      return;
    }

    void Workspace.create({
      wsName: wsName,
      database: eternalVars.appDatabase,
    }).then((ws) => {
      setWs(ws);

      void ws.listFiles().then((items) => {
        setItems(items);
      });
    });
  }, [wsName, eternalVars]);
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
