/**
 * IPC channel names for the desktop configuration store. Defined in a module
 * with no `electron`/node imports so both the sandboxed preload and the main
 * process can share them without pulling `ipcMain`/`fs` into the preload bundle.
 */
export const CONFIG_IPC = {
  getEntry: 'bangle:config:get-entry',
  getAllEntries: 'bangle:config:get-all-entries',
  putEntry: 'bangle:config:put-entry',
  deleteEntry: 'bangle:config:delete-entry',
} as const;
