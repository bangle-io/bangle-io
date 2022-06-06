import type { RenderReactNodeView } from '@bangle.io/extension-registry';
import { Extension } from '@bangle.io/extension-registry';

const extensionName = 'extension-example';

const renderReactNodeView: RenderReactNodeView = {
  // params
  // 1. nodeViewRenderArg object
  //  - https://bangle.dev/docs/api/react#bangleeditor-reactelement
  //  - https://github.com/kepta/bangle-play/blob/3a074f539afc711aff99ecfc064469e066a338bb/core/node-view.js#L13
  myPMNodeName: ({ nodeViewRenderArg }) => {
    return null;
  },
};

const extension = Extension.create({
  name: extensionName,
  editor: {
    plugins: [collabPlugin],
    renderReactNodeView: renderReactNodeView,
    ReactComponent: EditorReactComponent,
  },
});

function collabPlugin({}) {}

function EditorReactComponent() {
  return null;
}

export default extension;
