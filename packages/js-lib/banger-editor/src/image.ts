import { type CollectionType, collection } from './common';
import type { NodeSpec, PMNode } from './pm';
import { type Command, InputRule, inputRules, NodeSelection } from './pm';
import { getNodeType, type PluginContext } from './pm-utils';

export type ImageConfig = {
  name?: string;
};

type RequiredConfig = Required<ImageConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'image',
};

export function setupImage(userConfig?: ImageConfig) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const { name } = config;

  const nodes = {
    [name]: {
      inline: true,
      attrs: {
        src: {},
        alt: {
          default: null,
        },
        title: {
          default: null,
        },
      },
      group: 'inline',
      draggable: true,
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs: (dom) => ({
            src: dom.getAttribute('src'),
            title: dom.getAttribute('title'),
            alt: dom.getAttribute('alt'),
          }),
        },
      ],
      toDOM: (node: PMNode) => {
        return ['img', node.attrs];
      },
    } satisfies NodeSpec,
  };

  const plugin = {
    inputRules: pluginInputRules(config),
  };

  return collection({
    id: 'image',
    nodes,

    plugin,

    command: {
      updateImageNodeAttribute: updateImageNodeAttribute(config),
    },

    markdown: markdown(config),
  });
}

// PLUGINS
function pluginInputRules(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const { name } = config;
    const type = getNodeType(schema, name);
    return inputRules({
      rules: [
        new InputRule(
          /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/,

          (state, match, start, end) => {
            let [, alt, src, title] = match;
            if (!src) {
              return null;
            }

            if (!title) {
              title = alt;
            }
            return state.tr.replaceWith(
              start,
              end,
              type.create({
                src,
                alt,
                title,
              }),
            );
          },
        ),
      ],
    });
  };
}

// COMMANDS
function updateImageNodeAttribute(config: RequiredConfig) {
  return (attr: PMNode['attrs']): Command =>
    (state, dispatch) => {
      const { name } = config;
      const type = getNodeType(state.schema, name);

      if (
        !(state.selection instanceof NodeSelection) ||
        !state.selection.node
      ) {
        return false;
      }
      const { node } = state.selection;
      if (node.type !== type) {
        return false;
      }

      if (dispatch) {
        dispatch(
          state.tr.setNodeMarkup(state.selection.$from.pos, undefined, {
            ...node.attrs,
            ...attr,
          }),
        );
      }
      return true;
    };
}

// MARKDOWN
function markdown(config: RequiredConfig): CollectionType['markdown'] {
  const { name } = config;
  return {
    nodes: {
      [name]: {
        toMarkdown: (state, node) => {
          const text = state.esc(node.attrs.alt || '');
          const url =
            state.esc(node.attrs.src) +
            (node.attrs.title ? ` ${quote(node.attrs.title)}` : '');

          state.write(`![${text}](${url})`);
        },
        parseMarkdown: {
          image: {
            node: name,
            getAttrs: (tok) => ({
              src: tok.attrGet('src'),
              title: tok.attrGet('title') || null,
              alt: tok.children?.[0]?.content || null,
            }),
          },
        },
      },
    },
  };
}

function quote(str: string) {
  const wrap = str.includes('"') ? "'" : '"';
  return wrap + str + wrap;
}
