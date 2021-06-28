import editorCore from 'editor-core/index';
import inlineCommandPalette from 'inline-command-palette/index';
import inlineBacklinkPalette from 'inline-backlink/index';
import collapsibleHeading from 'collapsible-heading/index';
import imageExtension from 'image-extension/index';
import inlineEmoji from 'inline-emoji/index';
import collabExtension from 'collab-extension/index';
import editorScrollExtension from 'editor-scroll-extension';
import corePalette from 'core-palettes';
import coreActions from 'core-actions';
import { ExtensionRegistry } from 'extension-registry/index';
import searchNotes from 'search-notes';
import noteBrowser from 'note-browser';

// TODO move this async, i think a promise should be fine.
export const initExtensionRegistry = () => {
  return new ExtensionRegistry([
    inlineEmoji,
    editorCore,
    collabExtension,
    inlineCommandPalette,
    inlineBacklinkPalette,
    collapsibleHeading,
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
