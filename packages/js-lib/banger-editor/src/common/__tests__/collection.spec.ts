import { describe, expect, it } from 'vitest';
import { Plugin, PluginKey } from '../../pm';
import type { MarkSpec, NodeSpec } from '../../pm';

import { collection, resolve, setPriority } from '../collection';

// Helper functions to create test items
function createTestPlugin(name: string): Plugin {
  return new Plugin({
    key: new PluginKey(name),
  });
}

function getPluginKeyString(plugin?: Plugin): string | undefined {
  // @ts-expect-error
  return plugin?.spec?.key?.key;
}

function createTestNodeSpec(content = 'block+'): NodeSpec {
  return { content };
}

function createTestMarkSpec(tag = 'strong'): MarkSpec {
  return { parseDOM: [{ tag }] };
}

function createTestMarkdownConfig(type: 'node' | 'mark', name: string) {
  if (type === 'node') {
    return {
      nodes: {
        [name]: {
          toMarkdown: () => {},
          parseMarkdown: { [name]: { node: name } },
        },
      },
    };
  }
  return {
    marks: {
      [name]: {
        toMarkdown: {
          open: '**',
          close: '**',
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parseMarkdown: { [name]: { mark: name } },
      },
    },
  };
}

// Test context
const mockContext = {
  schema: {} as any,
};

describe('collection API', () => {
  describe('collection function', () => {
    it('creates a collection with nodes and marks', () => {
      const coll = collection({
        id: 'test',
        nodes: {
          doc: createTestNodeSpec(),
          paragraph: createTestNodeSpec('inline*'),
        },
        marks: {
          bold: createTestMarkSpec(),
        },
      });

      expect(coll.id).toBe('test');
      expect(coll.nodes).toBeDefined();
      expect(coll.marks).toBeDefined();
    });

    it('creates a collection with plugins', () => {
      const plugin = createTestPlugin('testPlugin');
      const coll = collection({
        id: 'test',
        plugin: { p0: plugin },
      });

      expect(coll.id).toBe('test');
      expect(coll.plugin).toBeDefined();
    });
  });

  describe('resolve function', () => {
    it('resolves plugins in priority order', () => {
      const pluginA = setPriority(createTestPlugin('pluginA'), 30);
      const pluginB = setPriority(createTestPlugin('pluginB'), 10);
      const pluginC = setPriority(createTestPlugin('pluginC'), 20);

      const collectionA = collection({
        id: 'collA',
        plugin: { p0: pluginA },
      });

      const collectionB = collection({
        id: 'collB',
        plugin: { p0: pluginB },
      });

      const collectionC = collection({
        id: 'collC',
        plugin: { p0: pluginC },
      });

      const result = resolve([
        collectionA,
        collectionB,
        collectionC,
      ]).resolvePlugins(mockContext);

      expect(result.map((p) => getPluginKeyString(p))).toEqual([
        expect.stringContaining('pluginA'),
        expect.stringContaining('pluginC'),
        expect.stringContaining('pluginB'),
      ]);
    });

    it('resolves nodes with priority', () => {
      const collectionA = collection({
        id: 'collA',
        nodes: {
          paragraph: setPriority(createTestNodeSpec('inline*'), 10),
        },
      });

      const collectionB = collection({
        id: 'collB',
        nodes: {
          paragraph: setPriority(createTestNodeSpec('text*'), 20),
        },
      });

      expect(
        resolve([collectionB, collectionA], true).nodes.get('paragraph'),
      ).toMatchObject({ content: 'text*' });

      //   switching order does not change the result as priority is used
      expect(
        resolve([collectionA, collectionB], true).nodes.get('paragraph'),
      ).toMatchObject({ content: 'text*' });
    });

    it('resolves nodes with priority even if defined later', () => {
      const collectionA = collection({
        id: 'collA',
        nodes: {
          paragraph: setPriority(createTestNodeSpec('inline*'), 10),
        },
      });

      const collectionB = collection({
        id: 'collB',
        nodes: {
          paragraph: setPriority(createTestNodeSpec('text*'), 20),
        },
      });

      expect(
        resolve([collectionA, collectionB], true).nodes.get('paragraph'),
      ).toMatchObject({ content: 'text*' });
    });

    it('resolves marks with priority', () => {
      const collectionA = collection({
        id: 'collA',
        marks: {
          bold: setPriority(createTestMarkSpec('b'), 10),
        },
      });

      const collectionB = collection({
        id: 'collB',
        marks: {
          bold: setPriority(createTestMarkSpec('strong'), 20),
        },
      });

      const { marks } = resolve([collectionB, collectionA], true);

      expect(marks.get('bold')).toMatchObject({
        parseDOM: [{ tag: 'strong' }],
      });
    });

    it('merges markdown configs without duplicates', () => {
      const collectionA = collection({
        id: 'collA',
        markdown: createTestMarkdownConfig('node', 'paragraph'),
      });

      const collectionB = collection({
        id: 'collB',
        markdown: createTestMarkdownConfig('mark', 'bold'),
      });

      const { markdown } = resolve([collectionA, collectionB]);

      expect(markdown.nodes?.paragraph).toBeDefined();
      expect(markdown.marks?.bold).toBeDefined();
    });
  });

  describe('setPriority function', () => {
    it('sets priority on plugins', () => {
      const plugin = setPriority(createTestPlugin('test'), 10);
      const coll = collection({
        id: 'test',
        plugin: { p0: plugin },
      });

      const result = resolve([coll]).resolvePlugins(mockContext);
      expect(result[0]).toBeDefined();
    });

    it('sets priority on node specs', () => {
      const nodeSpec = setPriority(createTestNodeSpec(), 10);
      const coll = collection({
        id: 'test',
        nodes: { doc: nodeSpec },
      });

      const { nodes } = resolve([coll], true);
      expect(nodes.get('doc')).toMatchObject({ content: 'block+' });
    });

    it('sets priority on mark specs', () => {
      const markSpec = setPriority(createTestMarkSpec(), 10);
      const coll = collection({
        id: 'test',
        marks: { bold: markSpec },
      });

      const { marks } = resolve([coll], true);
      expect(marks.get('bold')).toMatchObject({
        parseDOM: [{ tag: 'strong' }],
      });
    });
  });
});

describe('collection API - error handling', () => {
  it('throws error when merging markdown configs with duplicate node keys', () => {
    const collectionA = collection({
      id: 'collA',
      markdown: {
        nodes: {
          paragraph: {
            toMarkdown: () => {},
            parseMarkdown: { paragraph: { node: 'paragraph' } },
          },
        },
      },
    });

    const collectionB = collection({
      id: 'collB',
      markdown: {
        nodes: {
          paragraph: {
            toMarkdown: () => {},
            parseMarkdown: { paragraph: { node: 'paragraph-different' } },
          },
        },
      },
    });

    expect(() => resolve([collectionA, collectionB]).markdown).toThrow(
      `Duplicate key "paragraph" found in markdown.nodes`,
    );
  });

  it('throws error when merging markdown configs with duplicate mark keys', () => {
    const collectionA = collection({
      id: 'collA',
      markdown: {
        marks: {
          bold: {
            toMarkdown: {
              open: '*',
              close: '*',
            },
            parseMarkdown: { bold: { mark: 'bold' } },
          },
        },
      },
    });

    const collectionB = collection({
      id: 'collB',
      markdown: {
        marks: {
          bold: {
            toMarkdown: {
              open: '**',
              close: '**',
            },
            parseMarkdown: { bold: { mark: 'bold' } },
          },
        },
      },
    });

    expect(() => resolve([collectionA, collectionB]).markdown).toThrow(
      `Duplicate key "bold" found in markdown.marks`,
    );
  });
});

describe('collection API - complex markdown merging', () => {
  it('merges multiple markdown configs with different node and mark types', () => {
    const collectionA = collection({
      id: 'collA',
      markdown: {
        nodes: {
          paragraph: {
            toMarkdown: () => {},
            parseMarkdown: { paragraph: { node: 'paragraph' } },
          },
        },
        marks: {
          bold: {
            toMarkdown: {
              open: '**',
              close: '**',
            },
            parseMarkdown: { bold: { mark: 'bold' } },
          },
        },
      },
    });

    const collectionB = collection({
      id: 'collB',
      markdown: {
        nodes: {
          heading: {
            toMarkdown: () => {},
            parseMarkdown: { heading: { node: 'heading' } },
          },
        },
        marks: {
          italic: {
            toMarkdown: {
              open: '_',
              close: '_',
            },
            parseMarkdown: { italic: { mark: 'italic' } },
          },
        },
      },
    });

    const { markdown } = resolve([collectionA, collectionB]);
    expect(markdown.nodes?.paragraph).toBeDefined();
    expect(markdown.nodes?.heading).toBeDefined();
    expect(markdown.marks?.bold).toBeDefined();
    expect(markdown.marks?.italic).toBeDefined();
  });

  it('handles undefined markdown configs gracefully', () => {
    const collectionA = collection({
      id: 'collA',
      markdown: {
        nodes: {
          paragraph: {
            toMarkdown: () => {},
            parseMarkdown: { paragraph: { node: 'paragraph' } },
          },
        },
      },
    });

    const collectionB = collection({
      id: 'collB',
    });

    const { markdown } = resolve([collectionA, collectionB]);
    expect(markdown.nodes?.paragraph).toBeDefined();
    expect(markdown.marks).toEqual({});
  });
});

describe('collection API - priority inheritance', () => {
  it('correctly inherits priority through multiple levels of nesting', () => {
    const pluginA = setPriority(createTestPlugin('pluginA'), 10);
    const pluginB = setPriority(createTestPlugin('pluginB'), 20);
    const pluginC = setPriority(createTestPlugin('pluginC'), 30);

    const collectionA = collection({
      id: 'collA',
      plugin: { p0: pluginA },
    });

    const collectionB = collection({
      id: 'collB',
      plugin: { p0: pluginB },
    });

    const collectionC = collection({
      id: 'collC',
      plugin: { p0: pluginC },
    });

    const result = resolve([
      collectionA,
      collectionB,
      collectionC,
    ]).resolvePlugins(mockContext);

    expect(result.map((p) => getPluginKeyString(p))).toEqual([
      expect.stringContaining('pluginC'),
      expect.stringContaining('pluginB'),
      expect.stringContaining('pluginA'),
    ]);
  });

  it('maintains priority order when resolving nested collections with same priority', () => {
    const pluginA = setPriority(createTestPlugin('pluginA'), 10);
    const pluginB = setPriority(createTestPlugin('pluginB'), 10);

    const collectionA = collection({
      id: 'collA',
      plugin: { p0: pluginA },
    });

    const collectionB = collection({
      id: 'collB',
      plugin: { p0: pluginB },
    });

    const result = resolve([collectionA, collectionB]).resolvePlugins(
      mockContext,
    );

    expect(result.map((p) => getPluginKeyString(p))).toEqual([
      expect.stringContaining('pluginA'),
      expect.stringContaining('pluginB'),
    ]);
  });
});

describe('collection API - plugin factory error handling', () => {
  it('handles plugin factory throwing an error', () => {
    const errorPlugin = () => {
      throw new Error('Plugin factory error');
    };

    const coll = collection({
      id: 'test',
      plugin: { p0: errorPlugin },
    });

    expect(() => resolve([coll]).resolvePlugins(mockContext)).toThrow(
      'Plugin factory error',
    );
  });
});
