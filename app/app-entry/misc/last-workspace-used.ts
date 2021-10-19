export function saveLastWorkspaceUsed(wsName): void {
  window.localStorage.setItem('last-workspace-used', wsName);
}

export function getLastWorkspaceUsed(): string | undefined {
  let result = window.localStorage.getItem('last-workspace-used');
  if (result && typeof result === 'string') {
    return result;
  }
  return undefined;
}
