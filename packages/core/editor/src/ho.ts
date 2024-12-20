import type { ProseMirrorNode } from '@prosekit/pm/model';
import type { EditorState } from '@prosekit/pm/state';
import { Plugin, PluginKey } from '@prosekit/pm/state';
import type { Transaction } from '@prosekit/pm/state';
import { Decoration, DecorationSet } from '@prosekit/pm/view';
import type { EditorView } from '@prosekit/pm/view';
/**
 * Options for configuring the HoverClassPlugin.
 */
interface HoverClassOptions {
  /** The name of the node or mark to target. */
  type: string;
  /** The class to add on hover. */
  hoverClass: string;
  /**
   * Optional: The class to add to provide visual feedback when removing an existing decoration.
   * This is useful for when the transition is delayed to allow for animations to play out.
   */
  unhoverClass?: string;
  /** Optional: The attribute name to check for when applying the class. Defaults to "data-hover-id". */
  attributeName?: string;
}

/**
 * A ProseMirror plugin that adds a custom class to a specific node or mark type when hovered.
 *
 * @param options - Configuration options for the plugin.
 * @returns A ProseMirror plugin instance.
 */
export function HoverClassPlugin({
  type,
  hoverClass,
  unhoverClass,
  attributeName = 'data-hover-id',
}: HoverClassOptions): Plugin {
  const pluginKey = new PluginKey(`hoverClass-${type}`);

  return new Plugin({
    key: pluginKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, valueIn: DecorationSet) {
        // Map existing decorations to their new positions
        const value = valueIn.map(tr.mapping, tr.doc);

        const hoverId = tr.getMeta(pluginKey);

        // If no meta was set by mouse event handlers, return the current DecorationSet.
        if (hoverId === undefined) return value;

        // Handle removing the decoration
        if (hoverId === null) {
          const removals = value.find(
            undefined,
            undefined,
            (spec) => spec.key === pluginKey,
          );
          const nextDecos = value.remove(removals);

          if (unhoverClass && removals.length) {
            const unhoverDecos = removals.map((deco) => {
              return Decoration.inline(
                deco.from,
                deco.to,
                { class: unhoverClass },
                { key: `unhover-${pluginKey}` },
              );
            });

            return nextDecos.add(tr.doc, unhoverDecos);
          }

          return nextDecos;
        }

        // Handle adding the decoration
        const decorations: Decoration[] = [];
        tr.doc.descendants((node, pos) => {
          if (
            node.type.name === type &&
            node.attrs[attributeName] === hoverId
          ) {
            decorations.push(
              Decoration.inline(
                pos,
                pos + node.nodeSize,
                { class: hoverClass },
                { key: pluginKey },
              ),
            );
          } else if (type in node.marks.map((mark) => mark.type.name)) {
            const mark = node.marks.find((mark) => mark.type.name === type);
            if (mark?.attrs[attributeName] === hoverId) {
              decorations.push(
                Decoration.inline(
                  pos,
                  pos + node.nodeSize,
                  { class: hoverClass },
                  { key: pluginKey },
                ),
              );
            }
          }
        });

        return value.add(tr.doc, decorations);
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
      handleDOMEvents: {
        mouseover: (view, event) => {
          let target = event.target as HTMLElement;

          // Traverse up the DOM tree to find the attribute if it exists on a parent element.
          while (target && !target.hasAttribute?.(attributeName)) {
            target = target.parentElement as HTMLElement;
          }

          const hoverId = target?.getAttribute?.(attributeName);

          if (hoverId) {
            view.dispatch(view.state.tr.setMeta(pluginKey, hoverId));
          }

          return false;
        },
        mouseout: (view, event) => {
          const state = view.state;
          const decorations = pluginKey.getState(state);
          if (!decorations || decorations.size === 0) return false;

          const relatedTarget = event.relatedTarget as Node | null;

          // Check if the mouse is still within the same node
          if (relatedTarget) {
            const relatedTargetHoverId = (relatedTarget as HTMLElement)
              .closest(`[${attributeName}]`)
              ?.getAttribute(attributeName);
            const isWithinSameNode = relatedTargetHoverId !== null;
            if (isWithinSameNode) {
              return false;
            }
          }

          // Remove the decoration by setting the hoverId to null
          view.dispatch(view.state.tr.setMeta(pluginKey, null));
          return false;
        },
      },
    },
  });
}
