import { heading } from '@bangle.dev/base-components';
import type { EditorState, EditorView } from '@bangle.dev/pm';
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
  Selection,
} from '@bangle.dev/pm';

import {
  hasPluginStateChanged,
  intersectionObserverPluginKey,
} from '@bangle.io/editor-common';

const name = 'collapsible_heading_deco';
// TODO even after optimizations, this is far for perfect
// every keystroke triggers a redundant layout shift of
// collapsibles.
export function collapsibleHeading() {
  const plugin = new PluginKey(name);

  return [
    new Plugin<DecorationSet>({
      key: plugin,
      state: {
        init(_, state) {
          return buildDeco(state);
        },
        apply(tr, old, oldState, newState) {
          if (
            !tr.docChanged &&
            // watch for changes in intersection
            !hasPluginStateChanged(
              intersectionObserverPluginKey,
              newState,
              oldState,
            )
          ) {
            return old;
          }

          return buildDeco(newState);
        },
      },
      props: {
        decorations(state) {
          return plugin.getState(state);
        },
      },
    }),
  ];
}

function filterOutsideIntersection(
  headings: ReturnType<typeof heading.listCollapsibleHeading>,
  state: EditorState,
) {
  const intersectionState = intersectionObserverPluginKey.getState(state);

  if (!intersectionState) {
    return headings;
  }
  const result = headings.filter(
    (r) =>
      r.pos >= intersectionState.minStartPosition &&
      r.pos <= intersectionState.maxStartPosition,
  );

  return result;
}

function buildDeco(state: EditorState) {
  const collapsedHeadingSet = new Set(
    filterOutsideIntersection(heading.listCollapsedHeading(state), state).map(
      (r) => r.node,
    ),
  );
  const headings = filterOutsideIntersection(
    heading.listCollapsibleHeading(state),
    state,
  )
    .filter((r) => {
      return r.node.content.size > 0;
    })
    .map((match) => {
      return {
        ...match,
        collapsed: collapsedHeadingSet.has(match.node),
      };
    });

  function getNode<K extends keyof SVGElementTagNameMap>(
    n: K,
    v: { [k: string]: any },
  ) {
    let result = document.createElementNS('http://www.w3.org/2000/svg', n);
    for (var p in v) {
      result.setAttributeNS(null, p, v[p]);
    }

    return result;
  }

  const decos = headings.map((match) => {
    return Decoration.widget(
      match.pos + 1,
      (view: EditorView) => {
        let wrapper = document.createElement('span');
        wrapper.className = 'B-editor-common_deco-collapse-positioner';
        // wrapper.setAttribute('data-bangle-pos', match.pos + '');
        const child = document.createElement('span');
        child.className = 'B-editor-common_deco-collapse';

        wrapper.appendChild(child);

        const svg = getNode('svg', {
          viewBox: '0 0 24 24',
        });

        svg.addEventListener('click', function (e) {
          const tr = view.state.tr;

          view.dispatch(
            tr.setSelection(Selection.near(tr.doc.resolve(match.pos))),
          );

          let result = heading.toggleHeadingCollapse()(view.state);

          if (result) {
            heading.toggleHeadingCollapse()(view.state, view.dispatch, view);
            e.preventDefault();
          }
        });

        child.appendChild(svg);

        svg.setAttribute('class', 'B-editor-common_deco-collapse-child');

        svg.appendChild(
          getNode('path', {
            d: match.collapsed
              ? 'M10.5858 6.34317L12 4.92896L19.0711 12L12 19.0711L10.5858 17.6569L16.2427 12L10.5858 6.34317Z'
              : 'M6.34317 7.75732L4.92896 9.17154L12 16.2426L19.0711 9.17157L17.6569 7.75735L12 13.4142L6.34317 7.75732Z',
          }),
        );

        return wrapper;
      },
      {
        // the identity of collapsible heading depends on just
        // two things the position and whether its collapsible or not
        // this is used to decide whether to redraw the node or reuse it.
        key: match.pos + (match.collapsed ? 'true' : 'false'),
      },
    );
  });

  return DecorationSet.create(state.doc, decos);
}
