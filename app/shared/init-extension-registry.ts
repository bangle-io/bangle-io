import collabExtension from 'collab-extension';
import coreActions from 'core-actions';
import corePalette from 'core-palettes';
import editorCore from 'editor-core';
import editorScrollExtension from 'editor-scroll-extension';
import { ExtensionRegistry } from 'extension-registry';
import imageExtension from 'image-extension';
import inlineBacklinkPalette from 'inline-backlink';
import inlineCommandPalette from 'inline-command-palette';
import inlineEmoji from 'inline-emoji';
import noteBrowser from 'note-browser';
import searchNotes from 'search-notes';
import noteTags from 'note-tags';
import collapsibleHeading from 'collapsible-heading';

// TODO move this async, i think a promise should be fine.
export const initExtensionRegistry = () => {
  return new ExtensionRegistry([
    inlineEmoji,
    editorCore,
    collabExtension,
    inlineCommandPalette,
    inlineBacklinkPalette,
    noteTags,
    // collapsibleHeading,
    imageExtension,
    editorScrollExtension,
    coreActions,
    noteBrowser,
    searchNotes,
    // NOTE: keep the core palette last
    // as it has note palette in it
    corePalette,
  ]);
};
// export const initExtensionRegistry = async () => {
//   return new ExtensionRegistry(
//     await Promise.all([
//       import('editor-core/index').then((r) => r.default),
//       import('inline-command-palette/index').then((r) => r.default),
//       import('inline-backlink/index').then((r) => r.default),
//       import('collapsible-heading/index').then((r) => r.default),
//       import('image-extension/index').then((r) => r.default),
//       import('inline-emoji/index').then((r) => r.default),
//       import('collab-extension/index').then((r) => r.default),
//       import('editor-scroll-extension').then((r) => r.default),
//       import('core-palettes').then((r) => r.default),
//       // NOTE: keep the core palette last
//       // as it has note palette in it
//       import('core-actions').then((r) => r.default),
//     ]),
//   );
// };
