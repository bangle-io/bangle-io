import type { NodeBuilder } from 'prosemirror-test-builder';
import { setupBase } from '../base';
import { setupCodeBlock } from '../code-block';
import type { CollectionType } from '../common';
import { resolve } from '../common';
import { setupParagraph } from '../paragraph';
import {
  type Attrs,
  builders,
  EditorState,
  EditorView,
  NodeSelection,
  type PMNode,
  Schema,
  TextSelection,
} from '../pm';

type Tag = {
  cursor?: number;
  node?: number;
  start?: number;
  end?: number;
};

export type TaggedDoc = PMNode & {
  tag?: Tag;
};

type KeyModifiers = Pick<
  KeyboardEventInit,
  'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
>;

type BuilderAliases = Record<string, Attrs>;
type DefaultNodeBuilders = {
  codeBlock: NodeBuilder;
  doc: NodeBuilder;
  p: NodeBuilder;
};

const DEFAULT_BUILDER_ALIASES = {
  doc: { nodeType: 'doc' },
  p: { nodeType: 'paragraph' },
  codeBlock: { nodeType: 'code_block', language: '' },
} satisfies BuilderAliases;

function defaultExtensions(): CollectionType[] {
  return [setupBase(), setupParagraph(), setupCodeBlock()];
}

function selectionFromTags(doc: TaggedDoc) {
  const { cursor, node, start, end } = doc.tag ?? {};

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
}

function createKeyboardEvent(key: string, modifiers: KeyModifiers) {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
}

function assertSameDoc(actual: PMNode, expected: PMNode) {
  if (actual.eq(expected)) {
    return;
  }

  throw new Error(
    [
      'Expected ProseMirror documents to match.',
      `Actual: ${JSON.stringify(actual.toJSON())}`,
      `Expected: ${JSON.stringify(expected.toJSON())}`,
    ].join('\n'),
  );
}

export function createBangerEditorTestSetup({
  extensions = defaultExtensions(),
  builderAliases = DEFAULT_BUILDER_ALIASES,
}: {
  extensions?: CollectionType[];
  builderAliases?: BuilderAliases;
} = {}) {
  const resolved = resolve(extensions);
  const schema = new Schema({
    nodes: resolved.nodes,
    marks: resolved.marks,
  });
  const testBuilders = builders(schema, builderAliases);
  const views = new Set<EditorView>();
  const mounts = new Set<HTMLElement>();

  function nodeBuilder(name: string): NodeBuilder {
    const builder = testBuilders[name];
    if (typeof builder !== 'function') {
      throw new Error(`Missing ProseMirror test builder: ${name}`);
    }
    return builder as NodeBuilder;
  }
  const defaultNodeBuilders: DefaultNodeBuilders = {
    codeBlock: nodeBuilder('codeBlock'),
    doc: nodeBuilder('doc'),
    p: nodeBuilder('p'),
  };

  function cleanup() {
    for (const view of views) {
      if (!view.isDestroyed) {
        view.destroy();
      }
    }
    for (const mount of mounts) {
      mount.remove();
    }
    views.clear();
    mounts.clear();
  }

  function createEditor(initialDoc: TaggedDoc) {
    const mount = document.createElement('div');
    document.body.append(mount);
    mounts.add(mount);

    const selection = selectionFromTags(initialDoc);
    const state = EditorState.create({
      doc: initialDoc,
      schema,
      plugins: resolved.resolvePlugins({ schema }),
      ...(selection ? { selection } : {}),
    });
    const view = new EditorView({ mount }, { state });
    views.add(view);

    function setSelection(pos: number) {
      view.dispatch(
        view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)),
      );
    }

    return {
      view,
      pressKey(key: string, modifiers: KeyModifiers = {}) {
        const event = createKeyboardEvent(key, modifiers);
        view.dispatchEvent(event);
        return event.defaultPrevented;
      },
      runKeyDownHandlers(key: string, modifiers: KeyModifiers = {}) {
        const event = createKeyboardEvent(key, modifiers);
        let handled = false;

        view.someProp('handleKeyDown', (handler) => {
          if (handler(view, event)) {
            handled = true;
            return true;
          }
          return undefined;
        });

        return handled;
      },
      expectDoc(expectedDoc: PMNode) {
        assertSameDoc(view.state.doc, expectedDoc);
      },
      selectionParentType() {
        return view.state.selection.$from.parent.type.name;
      },
      selectionParentText() {
        return view.state.selection.$from.parent.textContent;
      },
      selectionParentOffset() {
        return view.state.selection.$from.parentOffset;
      },
      setSelection,
      setSelectionAtFirstBlockEnd() {
        const firstBlock = view.state.doc.firstChild;
        if (!firstBlock) {
          throw new Error('Expected a first block in the test document');
        }

        setSelection(1 + firstBlock.content.size);
      },
    };
  }

  return {
    builders: defaultNodeBuilders,
    cleanup,
    createEditor,
    nodeBuilder,
    schema,
  };
}
