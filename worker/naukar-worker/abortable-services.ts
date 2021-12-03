import { workerAbortable } from '@bangle.io/abortable-worker';
import type { ExtensionRegistry } from '@bangle.io/extension-registry';
import { searchPmNode } from '@bangle.io/search-pm-node';
import { assertSignal } from '@bangle.io/utils';
import { FileOps, fzfSearchNoteWsPaths } from '@bangle.io/workspaces';

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
      abortableFzfSearchNoteWsPaths: abortWrapper(fzfSearchNoteWsPaths),
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
    const wsPaths = await FileOps.listAllNotes(wsName);
    assertSignal(abortSignal);

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
