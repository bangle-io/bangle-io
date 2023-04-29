import { heading, listItem } from '@bangle.dev/base-components';
import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';

import { getNewStore } from '@bangle.io/api';
import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import { dispatchEditorCommand } from '@bangle.io/slice-editor-manager';

import { MenuComp } from './FloatingMenu';
import { getPlugins } from './plugins';
import { rawSpecs } from './spec-sheet';

const extensionName = '@bangle.io/core-editor';

const extension = Extension.create({
  name: extensionName,
  editor: {
    specs: rawSpecs,
    plugins: [getPlugins],
    ReactComponent: MenuComp,
    markdownItPlugins: [frontMatterMarkdownItPlugin],
  },
  application: {
    slices: [],
    operations: [
      {
        name: 'operation::@bangle.io/core-editor:collapse-heading',
        title: 'Editor: Collapse heading',
      },
      {
        name: 'operation::@bangle.io/core-editor:uncollapse-all-heading',
        title: 'Editor: Uncollapse all headings',
      },
      {
        name: 'operation::@bangle.io/core-editor:move-list-up',
        title: 'Editor: Move list up',
      },
      {
        name: 'operation::@bangle.io/core-editor:move-list-down',
        title: 'Editor: Move list down',
      },
    ],

    operationHandler() {
      const { toggleHeadingCollapse, uncollapseAllHeadings } = heading;
      const { moveListItemUp, moveListItemDown } = listItem;

      return {
        handle(operation, payload, bangleStore) {
          const nsmStore = getNewStore(bangleStore);

          switch (operation.name) {
            case 'operation::@bangle.io/core-editor:collapse-heading': {
              dispatchEditorCommand(
                nsmStore.state,
                PRIMARY_EDITOR_INDEX,
                toggleHeadingCollapse(),
              );

              return true;
            }

            case 'operation::@bangle.io/core-editor:uncollapse-all-heading': {
              dispatchEditorCommand(
                nsmStore.state,
                PRIMARY_EDITOR_INDEX,
                uncollapseAllHeadings(),
              );

              return true;
            }

            case 'operation::@bangle.io/core-editor:move-list-up': {
              dispatchEditorCommand(
                nsmStore.state,
                PRIMARY_EDITOR_INDEX,
                moveListItemUp(),
              );

              return true;
            }

            case 'operation::@bangle.io/core-editor:move-list-down': {
              dispatchEditorCommand(
                nsmStore.state,
                PRIMARY_EDITOR_INDEX,
                moveListItemDown(),
              );

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
