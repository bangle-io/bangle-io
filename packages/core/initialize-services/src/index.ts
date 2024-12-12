import {
  type Logger,
  flatServices,
  getEventSenderMetadata,
} from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { commandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';

import type {
  BaseServiceCommonOptions,
  RootEmitter,
  Services,
  Store,
} from '@bangle.io/types';
import { CoreServiceManager, ServiceFactory } from './initialize-services';
import { platformServicesSetup } from './platform-service-setup';

export function initializeServices(
  logger: Logger,
  rootEmitter: RootEmitter,
  store: Store,
  theme: ThemeManager,
  abortSignal: AbortSignal,
): Services {
  const commonOpts: BaseServiceCommonOptions = {
    logger,
    store,
    rootAbortSignal: abortSignal,
    emitAppError(error) {
      rootEmitter.emit('event::error:uncaught-error', {
        error,
        appLikeError: true,
        rejection: false,
        isFakeThrow: true,
        sender: getEventSenderMetadata({ tag: 'initialize-service' }),
      });
    },
  };

  const platform = platformServicesSetup(commonOpts, rootEmitter);

  const coreServiceManager = new CoreServiceManager(
    new ServiceFactory(),
    commonOpts,
    platform.services,
    rootEmitter,
    getEnabledCommands(),
    commandHandlers,
    theme,
  );

  platform.configure({
    workspaceOps: coreServiceManager.coreWorkspaceOpsService(),
  });

  const coreServices = coreServiceManager.getServices();
  coreServiceManager.configure();

  abortSignal.addEventListener(
    'abort',
    () => {
      flatServices(platform.services).forEach((service) => {
        service.dispose();
      });
      coreServiceManager.dispose();
    },
    { once: true },
  );

  return {
    core: coreServices,
    platform: platform.services,
  };
}
