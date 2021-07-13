import { heading } from '@bangle.dev/core';
import { Plugin, PluginKey, Selection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { rafSchedule } from 'utils/utility';

const name = 'collapsible_heading_deco';
const leftOffset = 24;
// TODO even after optimizations, this is far for perfect
// every keystroke triggers a redundant layout shift of
// collapsibles.
export function pluginsFactory() {
  const plugin = new PluginKey(name);

  return [
    new Plugin({
      key: plugin,
      view: () => ({}),
      state: {
        init(_, state) {
          return buildDeco(state);
        },
        apply(tr, old, oldState, newState) {
          return tr.docChanged ? buildDeco(newState) : old;
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

function buildDeco(state) {
  const collapsedHeadingSet = new Set(
    heading.listCollapsedHeading(state).map((r) => r.node),
  );
  const headings = heading
    .listCollapsibleHeading(state)
    .filter((r) => {
      return r.node.content.size > 0;
    })
    .map((match) => {
      return {
        ...match,
        collapsed: collapsedHeadingSet.has(match.node),
      };
    });

  function getNode(n, v) {
    n = document.createElementNS('http://www.w3.org/2000/svg', n);
    for (var p in v) {
      n.setAttributeNS(null, p, v[p]);
    }
    return n;
  }

  const decos = headings.map((match) => {
    return Decoration.widget(match.pos + 1, (view) => {
      let wrapper = document.createElement('span');
      wrapper.className = 'deco-collapse-positioner';
      // wrapper.setAttribute('data-bangle-pos', match.pos + '');
      const child = document.createElement('span');
      child.className = 'deco-collapse';

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

      svg.setAttribute('class', 'deco-collapse-child');

      svg.appendChild(
        getNode('path', {
          d: match.collapsed
            ? 'M10.5858 6.34317L12 4.92896L19.0711 12L12 19.0711L10.5858 17.6569L16.2427 12L10.5858 6.34317Z'
            : 'M6.34317 7.75732L4.92896 9.17154L12 16.2426L19.0711 9.17157L17.6569 7.75735L12 13.4142L6.34317 7.75732Z',
        }),
      );
      return wrapper;
    });
  });

  return DecorationSet.create(state.doc, decos);
}
