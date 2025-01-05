import { assertIsDefined } from '../common/misc';
import {
  Fragment,
  NodeSelection,
  type NodeType,
  PMSelection,
  ReplaceStep,
  Slice,
  TextSelection,
} from '../pm';
import type { Command, EditorState, EditorView, Schema } from '../pm';
import { mapChildren } from './helpers';
import { findParentNodeOfType } from './selection';
import { safeInsert } from './transforms';

type PredicateFunction = (state: EditorState, view?: EditorView) => boolean;
export type MoveDirection = 'UP' | 'DOWN';

/**
 * Moves a node of the given type up or down in the document.
 *
 * @param type - The type of the node to move.
 * @param dir - The direction to move the node ('UP' or 'DOWN').
 * @returns A ProseMirror command function.
 */
export function moveNode(type: NodeType, dir: MoveDirection = 'UP'): Command {
  const isDown = dir === 'DOWN';
  return (state, dispatch) => {
    // Only move if the selection is a cursor (empty).
    if (!state.selection.empty) {
      return false;
    }

    const { $from } = state.selection;

    // Find the parent node in the current selection with the given type.
    const currentResolved = findParentNodeOfType(type)(state.selection);
    if (!currentResolved) {
      return false;
    }

    const { node: currentNode, depth } = currentResolved;

    // Depth-1 to get the parent. If it's < 0, the node is top-level with no parent to reorder within.
    const parentDepth = depth - 1;
    if (parentDepth < 0) {
      return false;
    }

    const parent = $from.node(parentDepth);
    const parentPos = $from.start(parentDepth);

    // Double check that we have the right node type.
    if (currentNode.type !== type) {
      return false;
    }

    // Get an array of the parent's children.
    const arr = mapChildren(parent, (node) => node);

    const index = arr.indexOf(currentNode);
    if (index === -1) {
      return false;
    }

    const swapWith = isDown ? index + 1 : index - 1;
    // If out of bounds, we can’t swap.
    if (swapWith >= arr.length || swapWith < 0) {
      return false;
    }

    assertIsDefined(arr[swapWith], 'swapWithNode is undefined');

    const swapWithNodeSize = arr[swapWith].nodeSize;
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    [arr[index]!, arr[swapWith]!] = [arr[swapWith]!, arr[index]!];

    let tr = state.tr;

    // Replace the entire parent’s content (child array) with our reordered array.
    const replaceStart = parentPos;
    const replaceEnd = $from.end(parentDepth);

    // A Slice with openStart=0 and openEnd=0 means we’re inserting fully “closed” content (no extra open depth).
    const slice = new Slice(Fragment.fromArray(arr), 0, 0);
    tr = tr.step(new ReplaceStep(replaceStart, replaceEnd, slice, false));

    // Move the cursor near the new position of the previously selected node.
    tr = tr.setSelection(
      PMSelection.near(
        tr.doc.resolve(
          isDown ? $from.pos + swapWithNodeSize : $from.pos - swapWithNodeSize,
        ),
      ),
    );

    if (dispatch) {
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

/**
 * Jumps the cursor to the start (pos) of the nearest parent node of the given type.
 *
 * @param type - The type of the parent node to find.
 * @returns A ProseMirror command function.
 */
export function jumpToStartOfNode(type: NodeType): Command {
  return (state, dispatch) => {
    const current = findParentNodeOfType(type)(state.selection);
    if (!current) {
      return false;
    }
    const { start } = current;
    dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, start)));
    return true;
  };
}

/**
 * Jumps the cursor to the end of the nearest parent node of the given type.
 *
 * @param type - The type of the parent node to find.
 * @returns A ProseMirror command function.
 */
export function jumpToEndOfNode(type: NodeType): Command {
  return (state, dispatch) => {
    const current = findParentNodeOfType(type)(state.selection);
    if (!current) {
      return false;
    }
    const { node, start } = current;
    dispatch?.(
      state.tr.setSelection(
        TextSelection.create(state.doc, start + node.content.size),
      ),
    );
    return true;
  };
}

/**
 * Insert an empty paragraph above the nearest parent of the given node type.
 *
 * @param type - The type of the parent node to find.
 * @param getParagraphNodeType - A function that returns the paragraph node type.
 * @returns A ProseMirror command function.
 */
export function insertEmptyParagraphAboveNode(
  type: NodeType,
  getParagraphNodeType: (schema: Schema) => NodeType,
): Command {
  return (state, dispatch) => {
    const parent = findParentNodeOfType(type)(state.selection);
    if (!parent) {
      return false;
    }

    const newPara = getParagraphNodeType(state.schema).createAndFill();
    if (!newPara) {
      return false;
    }

    const insertPos = parent.pos;
    dispatch?.(safeInsert(newPara, insertPos)(state.tr));
    return true;
  };
}

/**
 * Insert an empty paragraph below the nearest parent of the given node type.
 *
 * @param type - The type of the parent node to find.
 * @param getParagraphNodeType - A function that returns the paragraph node type.
 * @returns A ProseMirror command function.
 */
export function insertEmptyParagraphBelowNode(
  type: NodeType,
  getParagraphNodeType: (schema: Schema) => NodeType,
): Command {
  return (state, dispatch) => {
    const parent = findParentNodeOfType(type)(state.selection);
    if (!parent) {
      return false;
    }

    const newPara = getParagraphNodeType(state.schema).createAndFill();
    if (!newPara) {
      return false;
    }

    const insertPos = parent.pos + parent.node.nodeSize;
    dispatch?.(safeInsert(newPara, insertPos)(state.tr));
    return true;
  };
}

/**
 * Finds a parent node in the ancestors and check if that node has a direct parent of type `parentsParentType`
 *
 * @param parentType - The type of the parent node to find.
 * @param parentsParentType - The type of the parent's parent node to check against.
 * @returns A function that takes an editor state and returns a boolean indicating if the condition is met.
 */
export function parentHasDirectParentOfType(
  parentType: NodeType,
  _parentsParentType: NodeType | NodeType[],
): (state: EditorState) => boolean {
  const parentsParentType = Array.isArray(_parentsParentType)
    ? _parentsParentType
    : [_parentsParentType];

  return (state) => {
    const currentResolved = findParentNodeOfType(parentType)(state.selection);
    if (!currentResolved) {
      return false;
    }

    const depth = currentResolved.depth - 1;
    if (depth < 0) {
      return false;
    }
    const parentsParent = state.selection.$from.node(depth);

    return (parentsParentType as NodeType[]).includes(parentsParent.type);
  };
}

/**
 * Creates a TextSelection that spans the parent node at the given depth.
 *
 * @param state - The editor state.
 * @param currentDepth - The depth of the parent node.
 * @returns A TextSelection spanning the parent node.
 */
function getParentTextSelection(state: EditorState, currentDepth: number) {
  const { $from } = state.selection;
  const parentPos = $from.start(currentDepth);
  const replaceStart = parentPos;
  const replaceEnd = $from.end(currentDepth);

  return TextSelection.create(state.doc, replaceStart, replaceEnd);
}

/**
 * Filters a command based on a given predicate or an array of predicates.
 *
 * @param predicates - A single predicate function or an array of predicate functions.
 * @param cmd - The command to filter.
 * @returns A filtered ProseMirror command function.
 */
export function filterCommand(
  predicates: PredicateFunction | PredicateFunction[],
  cmd?: Command,
): Command {
  return (state, dispatch, view) => {
    if (cmd == null) {
      return false;
    }
    if (!Array.isArray(predicates)) {
      // biome-ignore lint/style/noParameterAssign: <explanation>
      predicates = [predicates];
    }

    if (!predicates.every((pred) => pred(state, view))) {
      return false;
    }

    return cmd(state, dispatch, view) || false;
  };
}

/**
 * Executes a copy command on an empty selection within a node of the given type.
 *
 * @param type - The type of the node to copy.
 * @returns A ProseMirror command function.
 */
export function copyEmptyCommand(type: NodeType): Command {
  return (state, dispatch, view) => {
    if (!state.selection.empty) {
      return false;
    }
    const current = findParentNodeOfType(type)(state.selection);

    if (!current) {
      return false;
    }

    const selection = state.selection;
    let tr = state.tr;

    tr = tr.setSelection(getParentTextSelection(state, current.depth));

    if (dispatch) {
      dispatch(tr);
    }

    document.execCommand('copy');

    if (!view) {
      return true;
    }

    // restore the selection
    const tr2 = view.state.tr;
    if (dispatch) {
      dispatch(
        tr2.setSelection(
          PMSelection.near(tr2.doc.resolve(selection.$from.pos)),
        ),
      );
    }
    return true;
  };
}

/**
 * Executes a cut command on an empty selection within a node of the given type.
 *
 * @param type - The type of the node to cut.
 * @returns A ProseMirror command function.
 */
export function cutEmptyCommand(type: NodeType): Command {
  return (state, dispatch) => {
    if (!state.selection.empty) {
      return false;
    }

    const parent = findParentNodeOfType(type)(state.selection);

    if (!parent || !parent.node) {
      return false;
    }

    let tr = state.tr;
    tr = tr.setSelection(NodeSelection.create(tr.doc, parent.pos));

    if (dispatch) {
      dispatch(tr);
    }

    document.execCommand('cut');

    return true;
  };
}
