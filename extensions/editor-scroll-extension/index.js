import { Extension } from 'extension-registry/index';
import { extensionName } from './config';
import { PreserveScroll } from './editor-scroll-extension';
import { getSavedScrollPos, getSavedSelection } from './persist-scroll';
import { Selection } from 'prosemirror-state';

const extension = Extension.create({
  name: extensionName,
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
    ReactComponent: PreserveScroll,
  },
});

export default extension;
