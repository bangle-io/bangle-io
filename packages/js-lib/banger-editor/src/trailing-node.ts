import { collection } from './common';
import {
  type EditorView,
  type NodeType,
  Plugin,
  PluginKey,
  type Schema,
  TextSelection,
} from './pm';
import { defaultGetParagraphNodeType, getNodeType } from './pm-utils';

export type TrailingNodeConfig = {
  getTrailingNodeType?: (schema: Schema) => NodeType;
  notAfter?: string[];
};

type RequiredConfig = Required<TrailingNodeConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  getTrailingNodeType: defaultGetParagraphNodeType,
  notAfter: ['paragraph'],
};

const trailingNodePluginKey = new PluginKey('trailing-node');

export function setupTrailingNode(userConfig?: TrailingNodeConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  return collection({
    id: 'trailing-node',
    plugin: {
      clickAtEnd: pluginClickAtEnd(config),
    },
  });
}

function pluginClickAtEnd(config: RequiredConfig) {
  return ({ schema }: { schema: Schema }) => {
    const trailingType = config.getTrailingNodeType(schema);
    const ignoredTypes = new Set([
      trailingType,
      ...config.notAfter.map((name) => getNodeType(schema, name)),
    ]);

    return new Plugin({
      key: trailingNodePluginKey,
      props: {
        handleDOMEvents: {
          mousedown(view, event) {
            return clickAtEnd(view, event, trailingType, ignoredTypes);
          },
        },
      },
    });
  };
}

function clickAtEnd(
  view: EditorView,
  event: MouseEvent,
  trailingType: NodeType,
  ignoredTypes: Set<NodeType>,
) {
  if (
    event.button !== 0 ||
    event.defaultPrevented ||
    !view.editable ||
    !isClickBelowLastTopLevelNode(view, event)
  ) {
    return false;
  }

  const { doc } = view.state;
  const lastNode = doc.lastChild;
  if (!lastNode || ignoredTypes.has(lastNode.type)) {
    return false;
  }

  const trailingNode = trailingType.createAndFill();
  if (!trailingNode) {
    return false;
  }

  const insertPos = doc.content.size;
  const tr = view.state.tr.insert(insertPos, trailingNode);
  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
  view.dispatch(tr.scrollIntoView());
  event.preventDefault();
  return true;
}

function isClickBelowLastTopLevelNode(view: EditorView, event: MouseEvent) {
  const editorBounds = view.dom.getBoundingClientRect();
  if (
    event.clientX < editorBounds.left ||
    event.clientX > editorBounds.right ||
    event.clientY < editorBounds.top ||
    event.clientY > editorBounds.bottom
  ) {
    return false;
  }

  const lastElement = view.dom.lastElementChild;
  if (!lastElement) {
    return false;
  }

  return event.clientY > lastElement.getBoundingClientRect().bottom;
}
