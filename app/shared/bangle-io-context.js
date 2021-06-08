import { BangleIOContext } from 'bangle-io-context/index';
import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';
import editorCore from 'editor-core/index';
import inlineCommandPalette from 'inline-command-palette/index';
import inlineBacklinkPalette from 'inline-backlink/index';
import collapsibleHeading from 'collapsible-heading/index';
import imageExtension from 'image-extension/index';
import inlineEmoji from 'inline-emoji/index';
import collabExtension from 'collab-extension/index';
import editorScrollExtension from 'editor-scroll-extension';

// TODO move this async, i think a promise should be fine.
export const bangleIOContext = new BangleIOContext({
  coreRawSpecs: [],
  getCorePlugins: () => [],
  extensions: [
    inlineEmoji,
    editorCore,
    collabExtension,
    inlineCommandPalette,
    inlineBacklinkPalette,
    collapsibleHeading,
    imageExtension,
    editorScrollExtension,
  ],
  markdownItPlugins: [frontMatterMarkdownItPlugin],
});
