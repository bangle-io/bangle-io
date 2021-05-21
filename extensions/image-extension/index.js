import { image } from '@bangle.dev/core/components/components';
import { Extension } from 'extension-helpers';
import { NodeSelection } from '@bangle.dev/core/prosemirror/state';
import { imageNodeViewPlugin } from './image-node-view-plugin';
import { renderImageReactNodeView } from './render-image-react-node-view';
import { floatingMenu } from '@bangle.dev/react-menu';
import { ImageEditorReactComponent } from './ImageEditorReactComponent';
import { menuKey } from './config';
import { createImageNodes } from './create-image-nodes';

const extensionName = 'image-extension';

const extension = Extension.create({
  name: extensionName,
  editorSpecs: [image.spec()],
  editorPlugins: [
    image.plugins({
      createImageNodes: createImageNodes,
    }),
    imageNodeViewPlugin(),
    floatingMenu.plugins({
      key: menuKey,
      calculateType: (state, prevType) => {
        if (
          state.selection instanceof NodeSelection &&
          state.selection?.node?.type.name === 'image'
        ) {
          return 'imageMenu';
        }
        return null;
      },
    }),
  ],
  renderReactNodeView: renderImageReactNodeView,
  EditorReactComponent: ImageEditorReactComponent,
});

export default extension;
