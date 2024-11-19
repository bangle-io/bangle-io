import type { DatabaseService, Logger } from '@bangle.io/base-utils';
import { BaseService } from '@bangle.io/base-utils';
import type {
  FileSystemService,
  WorkspaceService,
} from '@bangle.io/service-core';
import React, { useEffect, createContext, useState } from 'react';

export type CoreServices = {
  workspace: WorkspaceService;
  fileSystem: FileSystemService;
  logger: Logger;
};
export const CoreServiceContext = createContext<CoreServices>(
  {} as CoreServices,
);

export function useCoreService() {
  return React.useContext(CoreServiceContext);
}

export function CoreServiceProvider({
  children,
  services,
}: {
  children: React.ReactNode;
  services: CoreServices;
}) {
  useEffect(() => {
    for (const service of Object.values(services)) {
      if (service instanceof BaseService) {
        service.initialize();
      }
    }
  }, [services]);

  return (
    <CoreServiceContext.Provider value={services}>
      {children}
    </CoreServiceContext.Provider>
  );
}
