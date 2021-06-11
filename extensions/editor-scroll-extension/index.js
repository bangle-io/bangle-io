import { Extension } from 'extension-helpers/index';
import { extensionName } from './config';
import { PreserveScroll } from './editor-scroll-extension';
import { getSavedScrollPos, getSavedSelection } from './persist-scroll';
import { Selection } from '@bangle.dev/core/prosemirror/state';

const extension = Extension.create({
  name: extensionName,
  EditorReactComponent: PreserveScroll,
  editor: {
    initialScrollPos({ wsPath, editorId, store }) {
      return getSavedScrollPos(wsPath, editorId);
    },
    initialSelection({ wsPath, editorId, doc }) {
      let selection = getSavedSelection(wsPath, editorId, doc);
      if (selection) {
        let { from } = selection;
        if (from >= doc.content.size) {
          selection = Selection.atEnd(doc);
        } else {
          selection = Selection.near(doc.resolve(from));
        }
        return selection;
      }
      return undefined;
    },
  },
});

export default extension;
