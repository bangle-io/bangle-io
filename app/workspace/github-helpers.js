import Github from 'github-api';
import * as _idb from 'idb-keyval';
import './nativefs-helpers';
import { resolvePath } from './path-helpers';

const urlParams = new URLSearchParams(window.location.search);

const z = new Github({
  token: urlParams.get('token'),
});

let getRepoName = (wsPath) => {
  let { wsName, filePath } = resolvePath(wsPath);
  if (wsName.startsWith('github--')) {
    return wsName.split('github--').join('');
  }
  return wsName;
};
export class GithubFS {
  // file
  static async getFile(wsPath, github) {
    let { wsName, filePath } = resolvePath(wsPath);

    const repo = await z.getRepo('kepta', getRepoName(wsPath));

    console.log(filePath);
    const { data } = await repo.getContents('master', filePath, true);

    return data;
  }

  static async deleteFile(wsPath) {}

  static async renameFile(wsPath, newWsPath) {}

  static async createFile(wsPath, payload) {}

  static async updateFile(wsPath, payload) {}

  static async listFiles(wsName, github) {
    const repo = await z.getRepo('kepta', getRepoName(wsName + ':' + 'sd'));

    const branch = await repo.getBranch('master');
    const sha = branch.data.commit.sha;
    const { tree } = (await repo.getTree(sha)).data;
    const result = tree.map((r) => wsName + ':' + r.path);
    return result;
  }
}
