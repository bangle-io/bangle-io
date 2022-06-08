import { image } from '@bangle.dev/base-components';
import { NodeSelection } from '@bangle.dev/pm';
import { floatingMenu } from '@bangle.dev/react-menu';

import { Extension } from '@bangle.io/extension-registry';

import { menuKey } from './config';
import { createImageNodes } from './create-image-nodes';
import { imageNodeViewPlugin } from './image-node-view-plugin';
import { ImageEditorReactComponent } from './ImageEditorReactComponent';
import { renderImageReactNodeView } from './render-image-react-node-view';

const extensionName = '@bangle.io/image-extension';

const extension = Extension.create({
  name: extensionName,
  editor: {
    specs: [image.spec()],
    plugins: [
      image.plugins({
        createImageNodes: createImageNodes,
      }),
      imageNodeViewPlugin(),
      floatingMenu.plugins({
        key: menuKey,
        calculateType: (state, prevType) => {
          if (
            state.selection instanceof NodeSelection &&
            state.selection.node.type.name === 'image'
          ) {
            return 'imageMenu';
          }

          return null;
        },
      }),
    ],
    renderReactNodeView: renderImageReactNodeView,
    ReactComponent: ImageEditorReactComponent,
  },
});

export default extension;
