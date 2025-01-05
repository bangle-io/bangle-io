import * as PMTestBuilder from 'prosemirror-test-builder';
import type { PMNode } from '../pm';
import { EditorView } from '../pm';
import { EditorState, NodeSelection, TextSelection } from '../pm';
import { buildTestSchema } from './schema';
export * from './schema';
const { builders } = PMTestBuilder;

type Tag = {
  cursor?: number;
  node?: number;
  start?: number;
  end?: number;
};
type Ref = {
  tag: Tag;
};
type DocumentTest = PMNode & Ref;
const initSelection = (
  doc: DocumentTest,
): TextSelection | NodeSelection | undefined => {
  const { cursor, node, start, end } = doc.tag;

  if (typeof node === 'number') {
    return new NodeSelection(doc.resolve(node));
  }
  if (typeof cursor === 'number') {
    return new TextSelection(doc.resolve(cursor));
  }
  if (typeof start === 'number' && typeof end === 'number') {
    return new TextSelection(doc.resolve(start), doc.resolve(end));
  }
  return undefined;
};

const testHelpers = builders(buildTestSchema(), {
  doc: { nodeType: 'doc' },
  p: { nodeType: 'paragraph' },
  text: { nodeType: 'text' },
  atomInline: { nodeType: 'atomInline' },
  atomBlock: { nodeType: 'atomBlock' },
  atomContainer: { nodeType: 'atomContainer' },
  heading: { nodeType: 'heading' },
  blockquote: { nodeType: 'blockquote' },
  a: { markType: 'link', href: 'foo' },
  strong: { markType: 'strong' },
  em: { markType: 'em' },
  code: { markType: 'code' },
  code_block: { nodeType: 'code_block' },
  hr: { markType: 'rule' },
});

type EditorHelper = {
  state: EditorState;
  view: EditorView;
} & Tag;

let view: EditorView;

// afterEach(() => {
//   if (!view) {
//     return;
//   }

//   view.destroy();
//   const editorMount = document.querySelector('#editor-mount');
//   editorMount?.parentNode?.removeChild(editorMount);
// });

const createEditor = (doc: DocumentTest): EditorHelper => {
  const editorMount = document.createElement('div');
  editorMount.setAttribute('id', 'editor-mount');

  document.body.appendChild(editorMount);
  const state = EditorState.create({
    doc,
    schema: buildTestSchema(),
    selection: initSelection(doc),
  });
  view = new EditorView(editorMount, { state });

  return { state, view, ...doc.tag };
};

export { createEditor, testHelpers };
