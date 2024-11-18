import type { DatabaseService, Logger } from '@bangle.io/base-utils';
import type { BaseService } from '@bangle.io/base-utils';
import type { WorkspaceService } from '@bangle.io/service-core';
import React, { useEffect, createContext, useState } from 'react';

type CoreContext = {
  workspace: WorkspaceService;
  logger: Logger;
};
export const CoreServiceContext = createContext<CoreContext>({} as CoreContext);

export function useCoreService() {
  return React.useContext(CoreServiceContext);
}

export function CoreServiceProvider({
  children,
  services,
}: {
  children: React.ReactNode;
  services: CoreContext;
}) {
  useEffect(() => {
    services.workspace.initialize();
  }, [services.workspace]);

  return (
    <CoreServiceContext.Provider value={services}>
      {children}
    </CoreServiceContext.Provider>
  );
}
