import { Extension } from 'extension-helpers';
import { nodeViewPlugin } from './image-extension-node';
import { renderReactNodeView } from './image-node-view';

const extensionName = 'image-extension';

const extension = Extension.create({
  name: extensionName,
  editorPlugins: [nodeViewPlugin()],
  renderReactNodeView: renderReactNodeView,
});

export default extension;
