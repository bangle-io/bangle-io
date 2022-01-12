export function saveLastWorkspaceUsed(wsName): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem('workspace-context/last-workspace-used', wsName);
}

export function getLastWorkspaceUsed(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const result = window.localStorage.getItem(
    'workspace-context/last-workspace-used',
  );
  if (result && typeof result === 'string') {
    return result;
  }

  return undefined;
}
