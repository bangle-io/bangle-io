import { BangleIOContext } from 'bangle-io-context/index';
import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';
import inlineCommandPalette from 'inline-command-palette/index';
import inlineBacklinkPalette from 'inline-backlink/index';
import { getPlugins, rawSpecs } from 'editor/index';
import collapsibleHeading from 'collapsible-heading/index';
import imageExtension from 'image-extension/index';
import inlineEmoji from 'inline-emoji/index';

// TODO move this async, i think a promise should be fine.
export const bangleIOContext = new BangleIOContext({
  coreRawSpecs: rawSpecs,
  getCorePlugins: getPlugins,
  extensions: [
    inlineCommandPalette,
    inlineBacklinkPalette,
    collapsibleHeading,
    imageExtension,
    inlineEmoji,
  ],
  markdownItPlugins: [frontMatterMarkdownItPlugin],
});
