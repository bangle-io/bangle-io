import browserNativefsStorage from '@bangle.io/browser-nativefs-storage';
import browserStorage from '@bangle.io/browser-storage';
import collabExtension from '@bangle.io/collab-extension';
import collapsibleHeading from '@bangle.io/collapsible-heading';
import coreActions from '@bangle.io/core-extension';
import corePalette from '@bangle.io/core-palettes';
import editorCore from '@bangle.io/editor-core';
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

// TODO move this async, i think a promise should be fine.
export const initExtensionRegistry = () => {
  return new ExtensionRegistry([
    inlineEmoji,
    browserStorage,
    browserNativefsStorage,
    editorCore,
    collabExtension,
    inlineCommandPalette,
    noteOutline,
    inlineBacklinkPalette,
    noteTags,
    collapsibleHeading,
    imageExtension,
    coreActions,
    noteBrowser,
    searchNotes,
    githubStorage,

    // NOTE: keep the core palette last
    // as it has note palette in it
    corePalette,
  ]);
};
