import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { BaseError } from '@bangle.io/base-error';
import { nsmExtensionRegistry } from '@bangle.io/extension-registry';
import { markdownParser } from '@bangle.io/markdown';
import { weakCache } from '@bangle.io/mini-js-utils';
import type { EffectStore } from '@bangle.io/nsm-3';
import {
  closeIfFound,
  nsmSliceWorkspace,
  openWsPathInNewTab as _openWsPathInNewTab,
  pushOpenedWsPaths as _pushOpenedWsPaths,
  pushPrimaryWsPath as _pushPrimaryWsPath,
  pushSecondaryWsPath as _pushSecondaryWsPath,
} from '@bangle.io/nsm-slice-workspace';
import type {
  EditorIdType,
  Node,
  WsName,
  WsPath,
} from '@bangle.io/shared-types';
import {
  goToInvalidWorkspacePage as _goToInvalidWorkspacePage,
  goToWorkspaceHome as _goToWorkspaceHome,
  nsmPageSlice,
  wsNameToPathname,
} from '@bangle.io/slice-page';
import { refreshWorkspace } from '@bangle.io/slice-refresh-workspace';
import { fs } from '@bangle.io/workspace-info';
import type { OpenedWsPaths } from '@bangle.io/ws-path';
import { resolvePath2 } from '@bangle.io/ws-path';

import { defaultDoc } from '../default-doc';
import type { ApiStoreState } from './internal/internals';
import { _internal_getStore } from './internal/internals';

export {
  goToWorkspaceAuthRoute,
  readWorkspaceInfo,
} from './internal/workspace';

export function useWorkspace() {
  return useNsmSliceState(nsmSliceWorkspace);
}

// lets try reduce the usage of these, since they couple internal state management
// with extensions

export function trackWorkspaceName(effectStore: EffectStore<any>) {
  return nsmSliceWorkspace.track(effectStore).wsName;
}

export function trackPageLifeCycleState(effectStore: EffectStore<any>) {
  return nsmPageSlice.track(effectStore).lifeCycleState;
}

const cachedApiState = weakCache((storeState: ApiStoreState) => {
  const wsState = nsmSliceWorkspace.get(storeState);
  const { isInactivePage } = nsmPageSlice.get(storeState);

  return {
    ...wsState,
    isInactivePage,
  };
});

export const workspaceState = () => {
  const store = _internal_getStore();

  return cachedApiState(store.state);
};

export const getNote = (wsPath: WsPath) => {
  const store = _internal_getStore();
  const { extensionRegistry } = nsmExtensionRegistry.get(store.state);

  return fs.getNote(wsPath, extensionRegistry);
};

export const createNote = async (
  wsPath: WsPath,
  opts: {
    doc?: Node;
    open?: boolean | 'primary' | 'secondary' | 'newTab';
  } = {},
): Promise<void> => {
  const store = _internal_getStore();
  const { extensionRegistry } = nsmExtensionRegistry.get(store.state);

  if (await getNote(wsPath)) {
    throw new BaseError({
      message: `Cannot create. Note "${
        resolvePath2(wsPath).fileName
      }" already exists.`,
    });
  }

  await fs.createNote(
    wsPath,
    extensionRegistry,
    opts.doc || defaultDoc(wsPath, extensionRegistry),
  );

  if (opts.open) {
    return pushWsPath(wsPath, opts.open);
  }

  return undefined;
};

export const renameNote = async (wsPath: WsPath, newWsPath: WsPath) => {
  const store = _internal_getStore();

  const { openedWsPaths, noteWsPaths } = nsmSliceWorkspace.get(store.state);

  if (noteWsPaths?.includes(newWsPath)) {
    throw new BaseError({
      message: `Cannot rename. Note "${
        resolvePath2(newWsPath).fileName
      }" already exists.`,
    });
  }

  store.dispatch(closeIfFound(wsPath));

  await fs.renameFile(wsPath, newWsPath);

  store.dispatch(
    _pushOpenedWsPaths(openedWsPaths.updateIfFound(wsPath, newWsPath)),
  );
};

export const deleteNote = (wsPath: WsPath) => {
  const store = _internal_getStore();

  store.dispatch(closeIfFound(wsPath));

  return fs.deleteFile(wsPath);
};

export const writeNote = async (wsPath: WsPath, doc: Node) => {
  const store = _internal_getStore();
  const { extensionRegistry } = nsmExtensionRegistry.get(store.state);

  await fs.writeNote(wsPath, extensionRegistry, doc);
};

export const writeFile = async (...args: Parameters<typeof fs.writeFile>) => {
  await fs.writeFile(...args);
};

export const readFile = async (...args: Parameters<typeof fs.readFile>) => {
  return await fs.readFile(...args);
};

export async function writeNoteFromMd(wsPath: WsPath, mdText: string) {
  const store = _internal_getStore();
  const { extensionRegistry } = nsmExtensionRegistry.get(store.state);

  const doc = markdownParser(
    mdText,
    extensionRegistry.specRegistry,
    extensionRegistry.markdownItPlugins,
  )!;

  await fs.writeNote(wsPath, extensionRegistry, doc);
}

export async function createNoteFromMd(wsPath: WsPath, mdText: string) {
  const store = _internal_getStore();
  const { extensionRegistry } = nsmExtensionRegistry.get(store.state);

  const doc = markdownParser(
    mdText,
    extensionRegistry.specRegistry,
    extensionRegistry.markdownItPlugins,
  )!;

  await fs.createNote(wsPath, extensionRegistry, doc);
}

export const pushWsPath = (
  wsPath: WsPath,
  openType: boolean | 'primary' | 'secondary' | 'newTab' = 'primary',
): void => {
  if (openType === 'primary' || openType === true) {
    return pushPrimaryWsPath(wsPath);
  } else if (openType === 'secondary') {
    return pushSecondaryWsPath(wsPath);
  } else if (openType === 'newTab') {
    return openWsPathInNewTab(wsPath);
  } else if (!openType) {
    return undefined;
  } else {
    let x: never = openType;
    throw new Error(`Invalid openType: ${x}`);
  }
};

export const pushPrimaryWsPath = (wsPath: WsPath): void => {
  const store = _internal_getStore();

  store.dispatch(_pushPrimaryWsPath(wsPath));
};

export const pushSecondaryWsPath = (wsPath: WsPath): void => {
  const store = _internal_getStore();

  store.dispatch(_pushSecondaryWsPath(wsPath));
};

export const goToWorkspace = ({
  wsName,
  type = 'replace',
}: {
  wsName: WsName;
  type: 'newTab' | 'replace';
}): void => {
  const store = _internal_getStore();

  if (type === 'newTab' && typeof window !== 'undefined') {
    window.open(wsNameToPathname(wsName));

    return;
  }
  store.dispatch(
    _goToWorkspaceHome({
      wsName,
      replace: type === 'replace',
    }),
  );
};

export const goToInvalidWorkspacePage = (wsName: WsName): void => {
  const store = _internal_getStore();

  store.dispatch(
    _goToInvalidWorkspacePage({
      invalidWsName: wsName,
      replace: true,
    }),
  );
};

export const openWsPathInNewTab = (wsPath: WsPath): void => {
  _openWsPathInNewTab(wsPath);
};

export const pushOpenedWsPath = (
  opened: OpenedWsPaths | ((arg: OpenedWsPaths) => OpenedWsPaths),
): void => {
  const store = _internal_getStore();

  store.dispatch(_pushOpenedWsPaths(opened));
};

export const closeEditor = (index?: EditorIdType): void => {
  const store = _internal_getStore();

  const op = _pushOpenedWsPaths((openedWsPaths) => {
    if (typeof index === 'number') {
      return openedWsPaths.updateByIndex(index, undefined).optimizeSpace();
    } else {
      return openedWsPaths.closeAll();
    }
  });

  store.dispatch(op);
};

/**
 * Refreshes to sync any updated files or workspaces
 */
export const refresh = () => {
  const store = _internal_getStore();

  store.dispatch(refreshWorkspace(), { debugInfo: 'refresh-nsm-api' });
};
