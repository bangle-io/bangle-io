import { workerAbortable } from '@bangle.io/abortable-worker';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import { searchPmNode } from '@bangle.io/search-pm-node';
import { FileOps } from '@bangle.io/workspaces';
import { isValidNoteWsPath } from '@bangle.io/ws-path';

export function abortableServices({
  extensionRegistry,
}: {
  extensionRegistry: ExtensionRegistry;
}) {
  const services = workerAbortable(({ abortWrapper }) => {
    return {
      abortableSearchWsForPmNode: abortWrapper(
        searchWsForPmNode(extensionRegistry),
      ),
    };
  });

  return services;
}

function searchWsForPmNode(extensionRegistry: ExtensionRegistry) {
  return async (
    abortSignal: AbortSignal,
    wsName: string,
    query: string,
    atomSearchTypes: Parameters<typeof searchPmNode>[4],
    opts?: Parameters<typeof searchPmNode>[5],
  ) => {
    const wsPaths = (await FileOps.listAllFiles(wsName)).filter((wsPath) =>
      isValidNoteWsPath(wsPath),
    );

    const getDoc = async (wsPath: string) =>
      FileOps.getDoc(
        wsPath,
        extensionRegistry.specRegistry,
        extensionRegistry.markdownItPlugins,
      );

    return searchPmNode(
      abortSignal,
      query,
      wsPaths,
      getDoc,
      atomSearchTypes,
      opts,
    );
  };
}
