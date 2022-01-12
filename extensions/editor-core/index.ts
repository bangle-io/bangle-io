import { heading, listItem } from '@bangle.dev/base-components';
import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';

import { dispatchEditorCommand } from '@bangle.io/slice-editor-manager';
import { Extension } from '@bangle.io/extension-registry';

import { MenuComp } from './FloatingMenu';
import { getPlugins } from './plugins';
import { rawSpecs } from './spec-sheet';

const extensionName = '@bangle.io/editor-core';

const extension = Extension.create({
  name: extensionName,
  editor: {
    specs: rawSpecs,
    plugins: [getPlugins],
    ReactComponent: MenuComp,
    markdownItPlugins: [frontMatterMarkdownItPlugin],
  },
  application: {
    operations: [
      {
        name: 'operation::@bangle.io/editor-core:collapse-heading',
        title: 'Editor: Collapse heading',
      },
      {
        name: 'operation::@bangle.io/editor-core:uncollapse-all-heading',
        title: 'Editor: Uncollapse all headings',
      },
      {
        name: 'operation::@bangle.io/editor-core:move-list-up',
        title: 'Editor: Move list up',
      },
      {
        name: 'operation::@bangle.io/editor-core:move-list-down',
        title: 'Editor: Move list down',
      },
    ],

    operationHandler() {
      const { toggleHeadingCollapse, uncollapseAllHeadings } = heading;
      const { moveListItemUp, moveListItemDown } = listItem;

      return {
        handle(operation, payload, bangleStore) {
          switch (operation.name) {
            case 'operation::@bangle.io/editor-core:collapse-heading': {
              dispatchEditorCommand(
                0,
                toggleHeadingCollapse(),
              )(bangleStore.state);
              return true;
            }

            case 'operation::@bangle.io/editor-core:uncollapse-all-heading': {
              dispatchEditorCommand(
                0,
                uncollapseAllHeadings(),
              )(bangleStore.state);
              return true;
            }

            case 'operation::@bangle.io/editor-core:move-list-up': {
              dispatchEditorCommand(0, moveListItemUp())(bangleStore.state);
              return true;
            }

            case 'operation::@bangle.io/editor-core:move-list-down': {
              dispatchEditorCommand(0, moveListItemDown())(bangleStore.state);
              return true;
            }

            default: {
              return undefined;
            }
          }
        },
      };
    },
  },
});

export default extension;
