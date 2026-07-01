import type { FileTreeIcons } from '@pierre/trees';

const BANGLE_FILE_ICON_SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true">
  <symbol id="bangle-file-icon-markdown" viewBox="0 0 16 16">
    <path fill="#4f7dd9" d="M2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9A1.5 1.5 0 0 1 2.5 2Z" />
    <path fill="#fff" d="M3.2 10.8V5.2h1.6L6.4 7.3 8 5.2h1.6v5.6H8V7.7L6.4 9.8 4.8 7.7v3.1H3.2Zm8.2 0L9.3 8.3h1.4V5.2h1.5v3.1h1.4l-2.2 2.5Z" />
  </symbol>
  <symbol id="bangle-file-icon-bangle" viewBox="0 0 16 16">
    <path fill="#db6f4a" d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z" />
    <path fill="#fff" d="M5.1 4.6h3.4c1.6 0 2.6.7 2.6 2 0 .7-.4 1.3-1 1.6.8.3 1.3.9 1.3 1.8 0 1.4-1.1 2.3-2.9 2.3H5.1V4.6Zm1.7 1.4v1.6h1.4c.8 0 1.2-.3 1.2-.8S9 6 8.2 6H6.8Zm0 2.9v1.9h1.6c.9 0 1.3-.3 1.3-.9 0-.7-.5-1-1.4-1H6.8Z" />
  </symbol>
</svg>`;

export const BANGLE_PIERRE_FILE_TREE_ICONS = {
  set: 'complete',
  colored: true,
  spriteSheet: BANGLE_FILE_ICON_SPRITE,
  byFileExtension: {
    md: 'bangle-file-icon-markdown',
    markdown: 'bangle-file-icon-markdown',
  },
  byFileName: {
    'bangle.md': 'bangle-file-icon-bangle',
    'readme.md': 'bangle-file-icon-markdown',
  },
} satisfies FileTreeIcons;
