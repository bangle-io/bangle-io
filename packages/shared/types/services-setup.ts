import type { WorkspaceOpsService } from '@bangle.io/service-core';
import type { PlatformServices } from './services';

type PlatformServicesConfig = {
  workspaceOps: WorkspaceOpsService;
};

export type PlatformServicesSetup = {
  services: PlatformServices;
  configure: (config: PlatformServicesConfig) => void;
};
