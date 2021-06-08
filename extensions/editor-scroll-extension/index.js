import { Extension } from 'extension-helpers/index';
import { extensionName } from './config';
import { PreserveScroll } from './editor-scroll-extension';
import { getSavedScrollPos, saveScrollPos } from './persist-scroll';

const extension = Extension.create({
  name: extensionName,
  EditorReactComponent: PreserveScroll,
  editor: {
    initialScrollPos({ wsPath, editorId, store }) {
      return getSavedScrollPos(wsPath, editorId);
    },
    beforeDestroy({ wsPath, editorId, store }) {
      saveScrollPos(wsPath, editorId);
    },
  },
});

function collabPlugin({
  // coming from pluginMetadata in Editor.jsx
  // props:
  // - `wsPath`
  // - `editorId`
  metadata,
}) {}

export default extension;
