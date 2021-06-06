import { Extension } from 'extension-helpers';

const extensionName = 'extension-example';

export const renderReactNodeView = {
  // params
  // 1. nodeViewRenderArg object
  //  - https://bangle.dev/docs/api/react#bangleeditor-reactelement
  //  - https://github.com/kepta/bangle-play/blob/3a074f539afc711aff99ecfc064469e066a338bb/core/node-view.js#L13
  // 2. wsPath - the current editors wsPath
  // 3. editorId - a number representing the editorId
  // 4. bangleIOContext itself
  myPMNodeName: ({ nodeViewRenderArg, wsPath, editorId, bangleIOContext }) => {
    return <span></span>;
  },
};

const extension = Extension.create({
  name: extensionName,
  editorPlugins: [collabPlugin],
  renderReactNodeView: renderReactNodeView,
});

function collabPlugin({
  // coming from pluginMetadata in Editor.jsx
  // props:
  // - `wsPath`
  // - `editorId`
  metadata,
}) {}

export default extension;
