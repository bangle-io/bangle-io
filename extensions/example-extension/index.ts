import { Extension } from 'extension-registry';

const extensionName = 'extension-example';

const renderReactNodeView = {
  // params
  // 1. nodeViewRenderArg object
  //  - https://bangle.dev/docs/api/react#bangleeditor-reactelement
  //  - https://github.com/kepta/bangle-play/blob/3a074f539afc711aff99ecfc064469e066a338bb/core/node-view.js#L13
  // 2. wsPath - the current editors wsPath
  // 3. editorId - a number representing the editorId
  // 4. extensionRegistry itself
  myPMNodeName: ({
    nodeViewRenderArg,
    wsPath,
    editorId,
    extensionRegistry,
  }) => {
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

function collabPlugin({
  // coming from pluginMetadata in Editor.jsx
  // props:
  // - `wsPath`
  // - `editorId`
  metadata,
}) {}

function EditorReactComponent({ wsPath, editorId }) {
  return null;
}

export default extension;
