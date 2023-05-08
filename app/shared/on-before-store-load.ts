// <-- PLOP INSERT EXTENSION IMPORT -->

import browserNativefsStorage from '@bangle.io/browser-nativefs-storage';
import browserPrivateFs from '@bangle.io/browser-privatefs-storage';
import browserStorage from '@bangle.io/browser-storage';
import { STORAGE_ON_CHANGE_EMITTER_KEY } from '@bangle.io/constants';
import editorCore from '@bangle.io/core-editor';
import coreActions from '@bangle.io/core-extension';
import corePalette from '@bangle.io/core-palettes';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import githubStorage from '@bangle.io/github-storage';
import imageExtension from '@bangle.io/image-extension';
import inlineBacklinkPalette from '@bangle.io/inline-backlink';
import inlineCommandPalette from '@bangle.io/inline-command-palette';
import inlineEmoji from '@bangle.io/inline-emoji';
import noteBrowser from '@bangle.io/note-browser';
import noteOutline from '@bangle.io/note-outline';
import noteTags from '@bangle.io/note-tags';
import searchNotes from '@bangle.io/search-notes';
import type { StorageProviderChangeType } from '@bangle.io/shared-types';
import { Emitter } from '@bangle.io/utils';
import { registerStorageProvider } from '@bangle.io/workspace-info';

// TODO move this async, i think a promise should be fine.
/**
 * Do certain setup before loading the store
 * @returns
 */
export const onBeforeStoreLoad = (): {
  registry: ExtensionRegistry;
  storageEmitter: Emitter<StorageProviderChangeType>;
} => {
  const registry = new ExtensionRegistry([
    inlineEmoji,
    browserStorage,
    browserNativefsStorage,
    browserPrivateFs,
    editorCore,
    inlineCommandPalette,
    noteOutline,
    inlineBacklinkPalette,
    noteTags,
    imageExtension,
    coreActions,
    noteBrowser,
    searchNotes,
    githubStorage,
    // <-- PLOP INSERT EXTENSION -->

    // NOTE: keep the core palette last
    // as it has note palette in it
    corePalette,
  ]);

  const emitter = new Emitter<StorageProviderChangeType>();
  for (const storageProvider of registry.getAllStorageProviders()) {
    storageProvider.onChange = (data) => {
      emitter.emit(STORAGE_ON_CHANGE_EMITTER_KEY, data);
    };
    // TODO do we need to pass specRegistry here? we should remove it if possible
    // to avoid coupling
    registerStorageProvider(storageProvider, registry.specRegistry);
  }

  return {
    registry,
    storageEmitter: emitter,
  };
};
