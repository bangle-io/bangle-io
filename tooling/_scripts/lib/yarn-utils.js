let cachedYarnGetVirtuals = undefined;
function yarnGetVirtuals() {
  if (cachedYarnGetVirtuals) {
    return JSON.parse(JSON.stringify(cachedYarnGetVirtuals));
  }

  cachedYarnGetVirtuals = require('child_process')
    .execSync(`yarn info --virtuals --all --json`)
    .toString()
    .split('\n')
    .filter(Boolean)
    .map((r) => JSON.parse(r));

  return yarnGetVirtuals();
}

let cachedYarnWorkspacesList = undefined;
function yarnWorkspacesList() {
  if (cachedYarnWorkspacesList) {
    return JSON.parse(JSON.stringify(cachedYarnWorkspacesList));
  }

  cachedYarnWorkspacesList = require('child_process')
    .execSync(`yarn workspaces list --verbose --json`)
    .toString()
    .split('\n')
    .filter(Boolean)
    .map((r) => JSON.parse(r));

  return yarnWorkspacesList();
}

module.exports = {
  yarnGetVirtuals,
  yarnWorkspacesList,
};
