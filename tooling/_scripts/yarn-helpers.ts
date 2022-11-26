interface YarnVirtuals {
  value: string;
  children: { Version: string; Dependencies: string; Instances: number };
}
let cachedYarnGetVirtuals: YarnVirtuals[] | undefined = undefined;

export function yarnGetVirtuals(): YarnVirtuals[] {
  if (cachedYarnGetVirtuals) {
    return JSON.parse(JSON.stringify(cachedYarnGetVirtuals));
  }

  cachedYarnGetVirtuals = require('child_process')
    .execSync(`yarn info --virtuals --all --json`)
    .toString()
    .split('\n')
    .filter(Boolean)
    .map((r: any) => JSON.parse(r));

  return yarnGetVirtuals();
}

interface YarnWorkspaceList {
  location: string;
  name: string;
  workspaceDependencies: string[];
}

let cachedYarnWorkspacesList: YarnWorkspaceList[] | undefined = undefined;

export function yarnWorkspacesList(): YarnWorkspaceList[] {
  if (cachedYarnWorkspacesList) {
    return JSON.parse(JSON.stringify(cachedYarnWorkspacesList));
  }

  cachedYarnWorkspacesList = require('child_process')
    .execSync(`yarn workspaces list --verbose --json`)
    .toString()
    .split('\n')
    .filter(Boolean)
    .map((r: any) => JSON.parse(r));

  return yarnWorkspacesList();
}
