import { getEventSenderMetadata, type Logger } from '@bangle.io/base-utils';
import type { ThemeManager } from '@bangle.io/color-scheme-manager';
import { commandHandlers } from '@bangle.io/command-handlers';
import { getEnabledCommands } from '@bangle.io/commands';
import type { Services } from '@bangle.io/context';
import type { EditorSaveCoordinator } from '@bangle.io/editor';

import type {
  BaseServiceCommonOptions,
  RootEmitter,
  Store,
} from '@bangle.io/types';
import { initializeServices as initializeServices2 } from './initialize-services';

export {
  createEditorSaveCoordinator,
  type EditorSaveCoordinator,
} from '@bangle.io/editor';
export { readEditorEngineFromUrl } from './initialize-services';

export function initializeServices(
  logger: Logger,
  rootEmitter: RootEmitter,
  store: Store,
  theme: ThemeManager,
  abortSignal: AbortSignal,
  editorSaveCoordinator: EditorSaveCoordinator,
): Promise<Services> {
  const commonOpts: BaseServiceCommonOptions = {
    logger,
    store,
    rootAbortSignal: abortSignal,
    emitAppError(error) {
      rootEmitter.emit('event::error:uncaught-error', {
        error,
        isAppError: true,
        isRejection: false,
        isFakeThrow: true,
        sender: getEventSenderMetadata({ tag: 'initialize-service' }),
      });
    },
  };

  const services = initializeServices2(
    commonOpts,
    rootEmitter,
    getEnabledCommands(),
    commandHandlers,
    theme,
    editorSaveCoordinator,
  );

  return services.mountAll().then(() => ({
    core: services.coreServices,
  }));
}
