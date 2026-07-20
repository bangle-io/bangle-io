export async function safeNavigatorStorageGetDirectory() {
  if (!navigator?.storage) {
    return undefined;
  }

  return navigator.storage.getDirectory();
}
