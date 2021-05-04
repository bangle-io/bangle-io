import { image } from '@bangle.dev/core/components/components';
import { Extension } from 'extension-helpers';

import { nodeViewPlugin } from './image-extension-node';
import { renderReactNodeView } from './image-node-view';
import { createImageNodes, EditorImageComponent } from './image-writing';

const extensionName = 'image-extension';

const extension = Extension.create({
  name: extensionName,
  editorSpecs: [image.spec()],
  editorPlugins: [
    image.plugins({
      createImageNodes,
    }),
    nodeViewPlugin(),
  ],
  renderReactNodeView: renderReactNodeView,
  editorReactComponent: EditorImageComponent,
});

export default extension;
