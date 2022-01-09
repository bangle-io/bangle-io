import {
  __serializeForClipboard,
  __parseFromClipboard,
} from 'prosemirror-view';
import { EditorView, DOMSerializer, Slice } from '@bangle.dev/pm';

export function sliceManualPaste(editorView: EditorView, slice: Slice) {
  const { dom } = __serializeForClipboard(editorView, slice);
  let pasteString = dom.innerHTML;
  let str = `<meta charset="utf-8">${pasteString}`;
  htmlManualPaste(editorView, str);
}

// copied from prosemirror to simulate a paste event
export function htmlManualPaste(editorView: EditorView, htmlStr: string) {
  function sliceSingleNode(slice) {
    return slice.openStart === 0 &&
      slice.openEnd === 0 &&
      slice.content.childCount === 1
      ? slice.content.firstChild
      : null;
  }

  function doPaste(view: EditorView, text, html: string, e) {
    let slice = __parseFromClipboard(
      view,
      text,
      html,
      (view as any).shiftKey,
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
      ? view.state.tr.replaceSelectionWith(singleNode, (view as any).shiftKey)
      : view.state.tr.replaceSelection(slice);
    view.dispatch(
      tr.scrollIntoView().setMeta('paste', true).setMeta('uiEvent', 'paste'),
    );
  }
  const pasteEvent = createEvent('paste');

  doPaste(editorView, null, htmlStr, pasteEvent);
}

export function domSerializer(view: EditorView) {
  return DOMSerializer.fromSchema(view.state.schema);
}

const createEvent = (
  name: string,
  options: { bubbles?: boolean; cancelable?: boolean; composed?: boolean } = {},
) => {
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
