import {
  marks as schemaBasicMarks,
  nodes as schemaBasicNodes,
} from 'prosemirror-schema-basic';
import { type DOMOutputSpec, type PMNode, Schema } from '../pm';

const {
  doc,
  paragraph,
  text,
  horizontal_rule: rule,
  blockquote,
  heading,
  code_block,
} = schemaBasicNodes;

type Attrs = {
  [key: string]: unknown;
};
const atomInline = {
  inline: true,
  group: 'inline',
  atom: true,
  attrs: {
    color: { default: null },
  },
  selectable: true,
  parseDOM: [
    {
      tag: 'span[data-node-type="atomInline"]',
      getAttrs: (dom: HTMLElement | string): Attrs => {
        return {
          color: (dom as HTMLElement).getAttribute('data-color'),
        };
      },
    },
  ],
  toDOM(node: PMNode): DOMOutputSpec {
    const { color } = node.attrs;
    const attrs = {
      'data-node-type': 'atomInline',
      'data-color': color,
    };
    return ['span', attrs];
  },
};

const atomBlock = {
  inline: false,
  group: 'block',
  atom: true,
  attrs: {
    color: { default: null },
  },
  selectable: true,
  parseDOM: [
    {
      tag: 'div[data-node-type="atomBlock"]',
      getAttrs: (dom: HTMLElement | string): Attrs => {
        return {
          color: (dom as HTMLElement).getAttribute('data-color'),
        };
      },
    },
  ],
  toDOM(node: PMNode): DOMOutputSpec {
    const { color } = node.attrs;
    const attrs = {
      'data-node-type': 'atomBlock',
      'data-color': color,
    };
    return ['div', attrs];
  },
};

const atomContainer = {
  inline: false,
  group: 'block',
  content: 'atomBlock',
  parseDOM: [
    {
      tag: 'div[data-node-type="atomBlockContainer"]',
    },
  ],
  toDOM(): DOMOutputSpec {
    return ['div', { 'data-node-type': 'atomBlockContainer' }];
  },
};

const containerWithRestrictedContent = {
  inline: false,
  group: 'block',
  content: 'paragraph+',
  parseDOM: [
    {
      tag: 'div[data-node-type="containerWithRestrictedContent"]',
    },
  ],
  toDOM(): DOMOutputSpec {
    return ['div', { 'data-node-type': 'containerWithRestrictedContent' }];
  },
};

const article = {
  inline: false,
  group: 'block',
  content: 'section*',
  parseDOM: [
    {
      tag: 'article',
    },
  ],
  toDOM(): DOMOutputSpec {
    return ['article', 0];
  },
};

const section = {
  inline: false,
  group: 'block',
  content: 'paragraph*',
  parseDOM: [
    {
      tag: 'section',
    },
  ],
  toDOM(): DOMOutputSpec {
    return ['section'];
  },
};

export const buildTestSchema = () => {
  return new Schema({
    nodes: {
      doc,
      heading,
      paragraph,
      text,
      atomInline,
      atomBlock,
      atomContainer,
      containerWithRestrictedContent,
      blockquote,
      rule,
      code_block,
      article,
      section,
    },
    marks: schemaBasicMarks,
  });
};
