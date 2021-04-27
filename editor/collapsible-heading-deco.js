import { PluginKey, Plugin } from '@bangle.dev/core/plugin';
import { Decoration, DecorationSet } from '@bangle.dev/core/prosemirror/view';
import { Selection } from '@bangle.dev/core/prosemirror/state';
import {
  listCollapsedHeading,
  listCollapsibleHeading,
  toggleHeadingCollapse,
} from '@bangle.dev/core/components/heading';
import { rafSchedule } from 'utils/utility';

export const collapsibleHeadingDeco = {
  plugins: pluginsFactory,
};

const name = 'collapsible_heading_deco';

// TODO even after optimizations, this is far for perfect
// every keystroke triggers a redundant layout shift of
// collapsibles.
function pluginsFactory({ leftOffset = 24 } = {}) {
  const plugin = new PluginKey(name);
  const updateHeight = rafSchedule((view) => {
    const nodes = [
      ...view.dom.querySelectorAll(
        '.deco-collapse-positioner[data-bangle-pos]',
      ),
    ]
      .map((node) => {
        const pos = parseInt(node.getAttribute('data-bangle-pos'), 10);
        if (Number.isNaN(pos)) {
          return undefined;
        }

        const domNode = view.nodeDOM(pos);
        if (!domNode) {
          return undefined;
        }
        // NOTE This separation of getting style and updating the style
        // is important as it prevent computing the layout everytime if were to do `window.getComputedStyle`
        // and then directly update height. With this approach
        // layout is only calculated once and then applied to all nodes
        // together.
        const computedStyle = window.getComputedStyle(domNode);
        return [node, computedStyle.height];
      })
      .filter(Boolean);

    for (const [node, height] of nodes) {
      node.firstChild.style.height = height;
      node.firstChild.style.left = `${-1 * leftOffset}px`;
    }
  });
  return [
    new Plugin({
      key: plugin,
      view: () => ({
        update(view, lastState) {
          const state = view.state;
          if (lastState === state) {
            return;
          }
          const newPluginState = plugin.getState(state);

          if (newPluginState === plugin.getState(lastState)) {
            return;
          }
          updateHeight(view);
        },
      }),
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
    listCollapsedHeading(state).map((r) => r.node),
  );
  const headings = listCollapsibleHeading(state)
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
      wrapper.setAttribute('data-bangle-pos', match.pos);
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

        let result = toggleHeadingCollapse()(view.state);

        if (result) {
          toggleHeadingCollapse()(view.state, view.dispatch, view);
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
