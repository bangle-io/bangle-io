import * as idb from 'idb-keyval';

import { wsPathHelpers } from '@bangle.io/api';

import { getFileBlob, getRepoTree } from './github-api-helpers';
import { GithubWsMetadata } from './helpers';

interface Leaf {
  wsPath: string;
  url: string;
}

const IDB_PREFIX = 'gh-tree-1:';

interface GHData {
  sha: string;
  tree: Leaf[];
}

export class GithubRepoTree {
  private static getTree = getRepoTree();
  private static async fetchData(
    wsName: string,
    wsMetadata: GithubWsMetadata,
    abortSignal: AbortSignal,
  ): Promise<GHData> {
    // TODO can move to checking if the gitsha is different using
    // graphql to optimize the request and save v3 api calls
    const ghRepoTree = await GithubRepoTree.getTree({
      wsName,
      abortSignal: abortSignal,
      config: {
        branch: wsMetadata.branch,
        owner: wsMetadata.owner,
        githubToken: wsMetadata.githubToken,
        repoName: wsName,
      },
    });

    return {
      sha: ghRepoTree.sha,
      tree: ghRepoTree.tree.map((r) => ({
        wsPath: r.wsPath,
        url: r.url,
      })),
    };
  }

  private static async getCachedData(wsName: string) {
    const data = await idb.get(IDB_PREFIX + wsName);

    if (!data) {
      return undefined;
    }

    return data as GHData;
  }

  private static async getData(
    wsName: string,
    wsMetadata: GithubWsMetadata,
    abortSignal: AbortSignal,
    useCache = true,
  ): Promise<GHData> {
    if (useCache) {
      const data = await GithubRepoTree.getCachedData(wsName);

      if (data) {
        return data;
      }
    }

    return GithubRepoTree.refreshCachedData(wsName, wsMetadata, abortSignal);
  }

  static async getFileBlob(
    wsPath: string,
    wsMetadata: GithubWsMetadata,
    abortSignal: AbortSignal,
  ) {
    const { wsName, fileName } = wsPathHelpers.resolvePath(wsPath, true);
    const data = await GithubRepoTree.getData(
      wsPathHelpers.resolvePath(wsPath).wsName,
      wsMetadata,
      abortSignal,
    );
    const match = data.tree.find((r) => r.wsPath === wsPath);

    if (!match) {
      return undefined;
    }

    return getFileBlob({
      config: {
        branch: wsMetadata.branch,
        owner: wsMetadata.owner,
        githubToken: wsMetadata.githubToken,
        repoName: wsName,
      },
      abortSignal,
      fileBlobUrl: match.url,
      fileName: fileName,
    });
  }

  static async getWsPaths(
    wsName: string,
    wsMetadata: GithubWsMetadata,
    abortSignal: AbortSignal,
  ) {
    const data = await GithubRepoTree.getData(wsName, wsMetadata, abortSignal);

    return data.tree.map((r) => r.wsPath);
  }

  static async refreshCachedData(
    wsName: string,
    wsMetadata: GithubWsMetadata,
    abortSignal: AbortSignal,
  ) {
    const data = await GithubRepoTree.fetchData(
      wsName,
      wsMetadata,
      abortSignal,
    );

    await idb.set(IDB_PREFIX + wsName, data);

    return data;
  }
}
