import { collection, keybinding } from './common';
import {
  type Command,
  Decoration,
  DecorationSet,
  dropPoint,
  type EditorState,
  type EditorView,
  NodeSelection,
  Plugin,
  PluginKey,
  type PMNode,
  Selection,
} from './pm';
import {
  findParentNodeOfType,
  getNodeType,
  isNodeSelection,
  type KeyCode,
  type PluginContext,
} from './pm-utils';

/**
 * Collapsible headings: fold the blocks that follow a heading (up to the next
 * heading of the same or higher level) so long notes are easier to scan.
 *
 * Folding is strictly a view concern. The document — and therefore the
 * serialized Markdown — is never modified; hidden blocks stay in the doc and
 * are only concealed with decorations. Fold state lives in plugin state and
 * resets when the editor is recreated.
 */
export type CollapsibleHeadingConfig = {
  /** Node name of the heading this plugin folds. Defaults to `heading`. */
  headingName?: string;
  keyToggleCollapse?: KeyCode;
  /** Accessible label for the fold toggle when the section is expanded. */
  collapseLabel?: string;
  /** Accessible label for the fold toggle when the section is folded. */
  expandLabel?: string;
};

type RequiredConfig = Required<CollapsibleHeadingConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  headingName: 'heading',
  keyToggleCollapse: false,
  collapseLabel: 'Collapse section',
  expandLabel: 'Expand section',
};

export type HeadingFoldRange = {
  /** Position right before the heading node that owns the fold. */
  headingPos: number;
  /** Start of the hidden region: the boundary right after the heading node. */
  from: number;
  /** End of the hidden region: the boundary after the last folded sibling. */
  to: number;
};

type FoldMeta =
  | { type: 'toggle'; pos: number }
  | { type: 'fold'; positions: number[] }
  | { type: 'unfold'; positions: number[] }
  | { type: 'unfoldAll' };

type FoldPluginState = {
  /** Sorted positions (before the node) of currently folded headings. */
  folded: number[];
  /** Hidden ranges derived from `folded` against the current doc. */
  ranges: HeadingFoldRange[];
  decorations: DecorationSet;
};

/**
 * Computes the range of sibling blocks that fold under the heading at
 * `headingPos`: everything after the heading up to (excluding) the next
 * sibling heading with the same or a higher level. Returns null when the
 * position does not hold a heading or the heading has nothing to fold.
 */
export function getHeadingFoldRange(
  doc: PMNode,
  headingPos: number,
  headingName = 'heading',
): HeadingFoldRange | null {
  if (headingPos < 0 || headingPos > doc.content.size) {
    return null;
  }
  const heading = doc.nodeAt(headingPos);
  if (!heading || heading.type.name !== headingName) {
    return null;
  }

  const $pos = doc.resolve(headingPos);
  const parent = $pos.parent;
  const headingIndex = $pos.index();
  if (parent.maybeChild(headingIndex) !== heading) {
    return null;
  }

  const from = headingPos + heading.nodeSize;
  let to = from;
  for (let i = headingIndex + 1; i < parent.childCount; i++) {
    const sibling = parent.child(i);
    if (
      sibling.type.name === headingName &&
      sibling.attrs.level <= heading.attrs.level
    ) {
      break;
    }
    to += sibling.nodeSize;
  }

  return to === from ? null : { headingPos, from, to };
}

export function setupCollapsibleHeading(userConfig?: CollapsibleHeadingConfig) {
  const config: RequiredConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const key = new PluginKey<FoldPluginState>('collapsible-heading');

  const toggleAtPos = (pos: number): Command => {
    return (state, dispatch) => {
      const pluginState = key.getState(state);
      if (!pluginState) {
        return false;
      }
      const isFolded = pluginState.folded.includes(pos);
      if (
        !isFolded &&
        !getHeadingFoldRange(state.doc, pos, config.headingName)
      ) {
        return false;
      }
      if (dispatch) {
        dispatch(
          state.tr.setMeta(key, { type: 'toggle', pos } satisfies FoldMeta),
        );
      }
      return true;
    };
  };

  const toggleAtSelection: Command = (state, dispatch) => {
    const found = findParentNodeOfType(
      getNodeType(state.schema, config.headingName),
    )(state.selection);
    if (!found) {
      return false;
    }
    return toggleAtPos(found.pos)(state, dispatch);
  };

  const collapseAllAtLevel = (level: number): Command => {
    return (state, dispatch) => {
      const pluginState = key.getState(state);
      if (!pluginState) {
        return false;
      }
      const targets: number[] = [];
      state.doc.descendants((node, pos) => {
        if (node.type.name !== config.headingName) {
          return true;
        }
        if (
          node.attrs.level === level &&
          !pluginState.folded.includes(pos) &&
          // A heading already hidden inside another folded section is left
          // alone: folding it too would silently stack recursive fold state.
          !pluginState.ranges.some((range) =>
            isNodeStartInsideFoldedContent(pos, range),
          ) &&
          getHeadingFoldRange(state.doc, pos, config.headingName)
        ) {
          targets.push(pos);
        }
        return false;
      });
      if (targets.length === 0) {
        return false;
      }
      if (dispatch) {
        dispatch(
          state.tr.setMeta(key, {
            type: 'fold',
            positions: targets,
          } satisfies FoldMeta),
        );
      }
      return true;
    };
  };

  /**
   * Moves a folded heading together with its hidden section to `dropPos`.
   * Nested fold state inside the section is preserved by re-anchoring it
   * relative to the heading's new position. Fails (returns false) for drops
   * inside the section itself and for non-top-level headings.
   */
  const moveFoldedSection = (headingPos: number, dropPos: number): Command => {
    return (state, dispatch) => {
      const pluginState = key.getState(state);
      if (!pluginState?.folded.includes(headingPos)) {
        return false;
      }
      if (state.doc.resolve(headingPos).depth !== 0) {
        return false;
      }
      const range = getHeadingFoldRange(
        state.doc,
        headingPos,
        config.headingName,
      );
      if (!range) {
        return false;
      }
      if (dropPos >= headingPos && dropPos <= range.to) {
        return false;
      }
      const slice = state.doc.slice(headingPos, range.to);
      const insertPos = dropPoint(state.doc, dropPos, slice);
      if (
        insertPos == null ||
        (insertPos >= headingPos && insertPos <= range.to)
      ) {
        return false;
      }
      if (dispatch) {
        const tr = state.tr;
        tr.delete(headingPos, range.to);
        const mapped = tr.mapping.map(insertPos);
        tr.insert(mapped, slice.content);
        tr.setMeta(key, {
          type: 'fold',
          positions: pluginState.folded
            .filter((pos) => pos >= headingPos && pos < range.to)
            .map((pos) => mapped + (pos - headingPos)),
        } satisfies FoldMeta);
        tr.setSelection(NodeSelection.create(tr.doc, mapped));
        tr.scrollIntoView();
        dispatch(tr);
      }
      return true;
    };
  };

  const uncollapseAll: Command = (state, dispatch) => {
    const pluginState = key.getState(state);
    if (!pluginState || pluginState.folded.length === 0) {
      return false;
    }
    if (dispatch) {
      dispatch(state.tr.setMeta(key, { type: 'unfoldAll' } satisfies FoldMeta));
    }
    return true;
  };

  const listCollapsedHeadings = (state: EditorState) => {
    const pluginState = key.getState(state);
    if (!pluginState) {
      return [];
    }
    return pluginState.ranges.map((range) => {
      const node = state.doc.nodeAt(range.headingPos);
      if (!node) {
        throw new Error('collapsible-heading: folded heading node missing');
      }
      return { pos: range.headingPos, node };
    });
  };

  const isHeadingCollapsed = (state: EditorState, pos?: number): boolean => {
    const pluginState = key.getState(state);
    if (!pluginState) {
      return false;
    }
    if (pos != null) {
      return pluginState.folded.includes(pos);
    }
    const found = findParentNodeOfType(
      getNodeType(state.schema, config.headingName),
    )(state.selection);
    return found ? pluginState.folded.includes(found.pos) : false;
  };

  const plugin = {
    fold: pluginFold(config, key, toggleAtPos, moveFoldedSection),
    keybindings: pluginKeybindings(config, toggleAtSelection),
  };

  return collection({
    id: 'collapsible-heading',
    plugin,
    command: {
      collapseAllHeadingsAtLevel: collapseAllAtLevel,
      moveFoldedHeadingSection: moveFoldedSection,
      toggleHeadingCollapse: toggleAtSelection,
      toggleHeadingCollapseAtPos: toggleAtPos,
      uncollapseAllHeadings: uncollapseAll,
    },
    query: {
      isHeadingCollapsed,
      listCollapsedHeadings,
    },
  });
}

function pluginKeybindings(config: RequiredConfig, toggleAtSelection: Command) {
  return () => {
    return keybinding(
      [[config.keyToggleCollapse, toggleAtSelection]],
      'collapsible-heading',
    );
  };
}

function pluginFold(
  config: RequiredConfig,
  key: PluginKey<FoldPluginState>,
  toggleAtPos: (pos: number) => Command,
  moveFoldedSection: (headingPos: number, dropPos: number) => Command,
) {
  return ({ schema }: PluginContext) => {
    // Ensure the heading node exists so a misconfigured name fails loudly.
    getNodeType(schema, config.headingName);

    return new Plugin<FoldPluginState>({
      key,
      state: {
        init: (_, state) => {
          return buildPluginState(state.doc, [], config, toggleAtPos);
        },
        apply: (tr, prev, _oldState, newState) => {
          const meta = tr.getMeta(key) as FoldMeta | undefined;

          let folded = prev.folded;
          if (tr.docChanged) {
            folded = folded.flatMap((pos) => {
              const result = tr.mapping.mapResult(pos);
              return result.deleted ? [] : [result.pos];
            });
          }

          if (meta?.type === 'toggle') {
            folded = folded.includes(meta.pos)
              ? folded.filter((pos) => pos !== meta.pos)
              : [...folded, meta.pos];
          } else if (meta?.type === 'fold') {
            folded = [...new Set([...folded, ...meta.positions])];
          } else if (meta?.type === 'unfold') {
            folded = folded.filter((pos) => !meta.positions.includes(pos));
          } else if (meta?.type === 'unfoldAll') {
            folded = [];
          }

          if (!tr.docChanged && folded === prev.folded) {
            return prev;
          }

          return buildPluginState(newState.doc, folded, config, toggleAtPos);
        },
      },
      appendTransaction: (transactions, oldState, newState) => {
        const pluginState = key.getState(newState);
        if (!pluginState || pluginState.ranges.length === 0) {
          return null;
        }
        const { selection } = newState;
        if (!selection.empty) {
          return null;
        }
        const head = selection.head;
        const containing = pluginState.ranges.filter(
          (range) => head > range.from && head < range.to,
        );
        if (containing.length === 0) {
          return null;
        }

        // A doc change that lands the cursor inside a folded region means the
        // user just edited hidden content (e.g. Enter at the end of a folded
        // heading). Reveal the section instead of letting the edit vanish.
        if (transactions.some((tr) => tr.docChanged)) {
          return newState.tr.setMeta(key, {
            type: 'unfold',
            positions: containing.map((range) => range.headingPos),
          } satisfies FoldMeta);
        }

        // Pure selection movement: push the cursor out of the hidden region,
        // following the direction the user was travelling.
        const forward = head > oldState.selection.head;
        const outside = selectionOutsideFolds(
          newState.doc,
          pluginState.ranges,
          head,
          forward,
        );
        return outside ? newState.tr.setSelection(outside) : null;
      },
      props: {
        decorations(state) {
          return key.getState(state)?.decorations ?? DecorationSet.empty;
        },
        // A folded heading must travel with its hidden section. The default
        // drop handling would move only the heading node (the drag handle
        // sets a NodeSelection on it), leaving the section behind and
        // silently expanding it — so the drop is rebuilt here instead.
        handleDrop(view, event, _slice, moved) {
          if (!moved) {
            return false;
          }
          const state = view.state;
          const selection = state.selection;
          if (!isNodeSelection(selection)) {
            return false;
          }
          const pluginState = key.getState(state);
          if (!pluginState?.folded.includes(selection.from)) {
            return false;
          }
          const coords = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          if (coords) {
            moveFoldedSection(selection.from, coords.pos)(state, view.dispatch);
          }
          // Swallow the drop even when the move was a no-op (e.g. dropping a
          // section onto itself): the default handler would tear the folded
          // section apart.
          return true;
        },
      },
    });
  };
}

function buildPluginState(
  doc: PMNode,
  requestedFolds: number[],
  config: RequiredConfig,
  toggleAtPos: (pos: number) => Command,
): FoldPluginState {
  const foldedSet = new Set(requestedFolds);
  const folded: number[] = [];
  const ranges: HeadingFoldRange[] = [];
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== config.headingName) {
      return true;
    }

    const range = getHeadingFoldRange(doc, pos, config.headingName);
    if (!range) {
      return false;
    }

    const isFolded = foldedSet.has(pos);
    // The toggle renders inline at the end of the heading text, keeping the
    // left gutter free for the block drag handle.
    decorations.push(
      Decoration.widget(
        pos + node.nodeSize - 1,
        (view: EditorView) =>
          createToggleWidget(view, pos, isFolded, config, toggleAtPos),
        {
          key: `collapsible-heading:${pos}:${isFolded}`,
          side: 1,
          ignoreSelection: true,
        },
      ),
    );

    if (!isFolded) {
      return false;
    }

    folded.push(pos);
    ranges.push(range);
    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: 'B-collapsible-heading-folded',
      }),
    );
    decorations.push(...hiddenBlockDecorations(doc, range));
    return false;
  });

  folded.sort((a, b) => a - b);
  ranges.sort((a, b) => a.headingPos - b.headingPos);

  return {
    folded,
    ranges,
    decorations: DecorationSet.create(doc, decorations),
  };
}

/** One node decoration per folded sibling block, so nodeViews stay mounted. */
function hiddenBlockDecorations(
  doc: PMNode,
  range: HeadingFoldRange,
): Decoration[] {
  const $heading = doc.resolve(range.headingPos);
  const parent = $heading.parent;
  const decorations: Decoration[] = [];
  let childPos = range.from;
  for (let i = $heading.index() + 1; i < parent.childCount; i++) {
    if (childPos >= range.to) {
      break;
    }
    const child = parent.child(i);
    decorations.push(
      Decoration.node(childPos, childPos + child.nodeSize, {
        class: 'B-collapsible-heading-hidden',
      }),
    );
    childPos += child.nodeSize;
  }
  return decorations;
}

function isNodeStartInsideFoldedContent(
  pos: number,
  range: HeadingFoldRange,
): boolean {
  return pos >= range.from && pos < range.to;
}

/**
 * Finds the closest visible cursor position outside every folded range,
 * preferring the travel direction. Returns null when `head` is already
 * outside or no better position exists.
 */
function selectionOutsideFolds(
  doc: PMNode,
  ranges: HeadingFoldRange[],
  head: number,
  preferForward: boolean,
): Selection | null {
  if (preferForward) {
    let pos = head;
    for (let i = 0; i <= ranges.length; i++) {
      const range = ranges.find((r) => pos > r.from && pos < r.to);
      if (!range) {
        return pos === head ? null : Selection.near(doc.resolve(pos), 1);
      }
      const next = Selection.near(doc.resolve(range.to), 1);
      if (next.head <= pos) {
        // Cannot make forward progress (e.g. the fold reaches the end of the
        // doc); fall back to searching backwards.
        break;
      }
      pos = next.head;
    }
  }

  let pos = head;
  for (let i = 0; i <= ranges.length; i++) {
    const range = ranges.find((r) => pos > r.from && pos < r.to);
    if (!range) {
      return pos === head ? null : Selection.near(doc.resolve(pos), -1);
    }
    const previous = Selection.near(doc.resolve(range.from), -1);
    if (previous.head >= pos) {
      return null;
    }
    pos = previous.head;
  }
  return null;
}

const CHEVRON_PATH =
  'M6.34 7.76 4.93 9.17 12 16.24l7.07-7.07-1.41-1.41L12 13.41 6.34 7.76Z';

function createToggleWidget(
  view: EditorView,
  headingPos: number,
  folded: boolean,
  config: RequiredConfig,
  toggleAtPos: (pos: number) => Command,
): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = 'B-collapsible-heading-toggle-wrapper';
  wrapper.contentEditable = 'false';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'B-collapsible-heading-toggle';
  button.tabIndex = -1;
  button.setAttribute('aria-expanded', String(!folded));
  button.setAttribute('data-folded', String(folded));
  button.setAttribute(
    'aria-label',
    folded ? config.expandLabel : config.collapseLabel,
  );

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CHEVRON_PATH);
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  button.appendChild(svg);

  // Keep the editor selection/focus untouched while interacting with the
  // toggle; the click is handled entirely through the fold command.
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    toggleAtPos(headingPos)(view.state, view.dispatch);
  });

  wrapper.appendChild(button);
  return wrapper;
}
