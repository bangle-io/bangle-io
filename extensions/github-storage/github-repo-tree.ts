import * as idb from 'idb-keyval';

import { resolvePath } from '@bangle.io/ws-path';

import { getFileBlob, getTree } from './github-api-helpers';
import { GithubWsMetadata } from './helpers';

interface Leaf {
  wsPath: string;
  url: string;
}

const IDB_PREFIX = 'gh-tree-1:';

interface GHData {
  sha: string;
  tree: Array<Leaf>;
}

export class GithubRepoTree {
  private static async fetchData(
    wsName: string,
    wsMetadata: GithubWsMetadata,
  ): Promise<GHData> {
    // TODO can move to checking if the gitsha is different using
    // graphql to optimize the request and save v3 api calls
    const ghRepoTree = await getTree({
      wsName,
      abortSignal: new AbortController().signal,
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
    useCache = true,
  ): Promise<GHData> {
    if (useCache) {
      const data = await GithubRepoTree.getCachedData(wsName);
      if (data) {
        return data;
      }
    }
    return GithubRepoTree.refreshCachedData(wsName, wsMetadata);
  }

  static async getFileBlob(wsPath: string, wsMetadata: GithubWsMetadata) {
    const { wsName, fileName } = resolvePath(wsPath);
    const data = await GithubRepoTree.getData(
      resolvePath(wsPath).wsName,
      wsMetadata,
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
      fileBlobUrl: match.url,
      fileName: fileName,
    });
  }

  static async getWsPaths(wsName: string, wsMetadata: GithubWsMetadata) {
    const data = await GithubRepoTree.getData(wsName, wsMetadata);
    return data.tree.map((r) => r.wsPath);
  }

  static async refreshCachedData(wsName: string, wsMetadata: GithubWsMetadata) {
    const data = await GithubRepoTree.fetchData(wsName, wsMetadata);
    await idb.set(IDB_PREFIX + wsName, data);
    return data;
  }
}
