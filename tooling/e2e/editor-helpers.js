module.exports = { setupClipboard };

async function setupClipboard(page) {
  return page.addScriptTag({
    content: `
    import {
        __serializeForClipboard,
        __parseFromClipboard,
      } from 'https://cdn.skypack.dev/prosemirror-view@^1.20.3';
      import { Slice } from 'https://cdn.skypack.dev/prosemirror-model@^1.15.0';
      
      const createEvent = (name, options = {}) => {
        let event;
        if (options.bubbles === undefined) {
          options.bubbles = true;
        }
        if (options.cancelable === undefined) {
          options.cancelable = true;
        }
        if (options.composed === undefined) {
          options.composed = true;
        }
        event = new Event(name, options);
      
        return event;
      };
      
      window.__manualEditorCopy = (view, slice) => {
        const { dom } = __serializeForClipboard(view, slice);
        let pasteString = dom.innerHTML;
        return '<meta charset="utf-8">' + pasteString;
      };
      window.__manualEditorPaste = (view, htmlStr) => {
        function sliceSingleNode(slice) {
          return slice.openStart === 0 &&
            slice.openEnd === 0 &&
            slice.content.childCount === 1
            ? slice.content.firstChild
            : null;
        }
      
        function doPaste(view, text, html, e) {
          let slice = __parseFromClipboard(
            view,
            text,
            html,
            view.shiftKey,
            view.state.selection.$from,
          );
      
          if (
            view.someProp('handlePaste', (f) => f(view, e, slice || Slice.empty)) ||
            !slice
          ) {
            return;
          }
      
          let singleNode = sliceSingleNode(slice);
          let tr = singleNode
            ? view.state.tr.replaceSelectionWith(singleNode, view.shiftKey)
            : view.state.tr.replaceSelection(slice);
          view.dispatch(
            tr.scrollIntoView().setMeta('paste', true).setMeta('uiEvent', 'paste'),
          );
        }
        const pasteEvent = createEvent('paste');
      
        doPaste(view, null, htmlStr, pasteEvent);
      };
      
        `,
    type: 'module',
  });
}
