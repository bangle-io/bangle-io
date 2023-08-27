import { heading, listItem } from '@bangle.dev/base-components';

import { nsmApi2 } from '@bangle.io/api';
import { PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { markdownItPlugins, rawSpecs } from '@bangle.io/editor-common';
import { getPlugins } from '@bangle.io/editor-plugins';
import { Extension } from '@bangle.io/extension-registry';

import { MenuComp } from './FloatingMenu';

const extensionName = '@bangle.io/core-editor';

const extension = Extension.create({
  name: extensionName,
  editor: {
    specs: rawSpecs,
    plugins: [getPlugins],
    ReactComponent: MenuComp,
    markdownItPlugins: markdownItPlugins,
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
        handle(operation) {
          switch (operation.name) {
            case 'operation::@bangle.io/core-editor:collapse-heading': {
              nsmApi2.editor.dispatchEditorCommand(
                PRIMARY_EDITOR_INDEX,
                toggleHeadingCollapse(),
              );

              return true;
            }

            case 'operation::@bangle.io/core-editor:uncollapse-all-heading': {
              nsmApi2.editor.dispatchEditorCommand(
                PRIMARY_EDITOR_INDEX,
                uncollapseAllHeadings(),
              );

              return true;
            }

            case 'operation::@bangle.io/core-editor:move-list-up': {
              nsmApi2.editor.dispatchEditorCommand(
                PRIMARY_EDITOR_INDEX,
                moveListItemUp(),
              );

              return true;
            }

            case 'operation::@bangle.io/core-editor:move-list-down': {
              nsmApi2.editor.dispatchEditorCommand(
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
