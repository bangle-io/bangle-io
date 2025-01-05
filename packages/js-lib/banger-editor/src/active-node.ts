import { collection } from './common/collection';
import { type EditorState, Plugin, PluginKey } from './pm';
import { Decoration, DecorationSet } from './pm';
import { findParentNode } from './pm-utils';

export interface ActiveNodeConfig {
  excludedNodes?: string[];
}

export function setupActiveNode(config: ActiveNodeConfig = {}) {
  const plugin = {
    activeNode: pluginActiveNode(config),
  };

  return collection({
    id: 'active-node',
    plugin,
  });
}

function pluginActiveNode(config: ActiveNodeConfig) {
  const key = new PluginKey('active-node');

  return new Plugin({
    key,
    state: {
      init: (_, state) => {
        return buildDeco(state, config);
      },
      apply: (tr, old, _oldState, newState) => {
        if (!tr.selectionSet) {
          return old;
        }
        return buildDeco(newState, config);
      },
    },
    props: {
      decorations(state) {
        return key.getState(state);
      },
    },
  });
}

function buildDeco(
  state: EditorState,
  config: ActiveNodeConfig,
): DecorationSet {
  const { selection } = state;
  const { $from } = selection;

  // Only decorate for an empty (cursor) selection
  if (!selection.empty) {
    return DecorationSet.empty;
  }

  // Get a valid block range for the cursor's parent block
  const range = $from.blockRange();
  if (!range) {
    // If `blockRange()` is null/undefined, no valid block to decorate
    return DecorationSet.empty;
  }

  // If that parent is not actually a block node, skip
  const parentNode = $from.node(range.depth);
  if (!parentNode || !parentNode.isBlock) {
    return DecorationSet.empty;
  }

  if (
    // the previous parentNode is different and is one level above the current parentNode
    // for example when in blockquote -> the `parentNode` is the blockquote node
    // where as the code below will scan for all parent nodes, in case of blockquote, it will be paragraph node -> blockquote node
    findParentNode((node) => {
      return !!config.excludedNodes?.includes(node.type.name);
    })(state.selection)
  ) {
    return DecorationSet.empty;
  }

  // Grab the start/end from the block range
  const { start, end } = range;

  // Now we can safely create a node decoration that spans the entire block node
  const deco = Decoration.node(start, end, {
    class: 'rounded-sm animate-editor-selected-node',
  });

  // Build the set with one node decoration
  return DecorationSet.create(state.doc, [deco]);
}
