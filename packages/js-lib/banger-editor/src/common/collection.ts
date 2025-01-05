import type { MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown';
import {
  type Command,
  type EditorState,
  type MarkSpec,
  type NodeSpec,
  OrderedMap,
  PMPlugin,
} from '../pm';
import type { Schema } from '../pm';
import { getGlobalConfig } from './global-config';

export type CommandType = Command | ((...args: any[]) => Command);
export type QueryType = (state: EditorState, ...args: any[]) => any;

export type CollectionType = {
  id: string;
  plugin?: Record<string, PluginFactory>;
  nodes?: Record<string, NodeSpec>;
  marks?: Record<string, MarkSpec>;
  command?: Record<string, CommandType>;
  query?: Record<string, QueryType>;
  markdown?: MarkdownConfig;
};

export const BANGLE_METADATA = Symbol('BANGLE_METADATA');

type Metadata = {
  priority?: number;
  debugInfo?: string;
};

function isPlainObject(value: any) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  );
}

function getMetadata(item: PMPlugin | NodeSpec | MarkSpec): Metadata | null {
  if (item instanceof PMPlugin || isPlainObject(item)) {
    return (item as any)[BANGLE_METADATA] ?? null;
  }
  return null;
}

export function setPluginPriority<T extends PluginFactory>(
  plugin: T,
  priority: number,
  debugInfo?: string,
): T {
  if (typeof plugin === 'function') {
    return ((ctx) => {
      const result = plugin(ctx);
      return setPluginPriority(result as any, priority, debugInfo);
    }) as T;
  }

  if (plugin instanceof PMPlugin) {
    setMetadata(plugin, { priority, debugInfo });
    return plugin;
  }

  if (Array.isArray(plugin)) {
    return plugin.map((p) => setPluginPriority(p, priority, debugInfo)) as T;
  }

  return plugin;
}

function setMetadata(
  item: null | PMPlugin | NodeSpec | MarkSpec,
  metadata: Partial<Metadata>,
): void {
  if (item == null) {
    return;
  }
  if (item instanceof PMPlugin || isPlainObject(item)) {
    const existingMetadata: Metadata = getMetadata(item) ?? {};
    (item as any)[BANGLE_METADATA] = {
      ...existingMetadata,
      ...metadata,
    } satisfies Metadata;
  }
}

export function setPriority<
  const T extends null | PMPlugin | NodeSpec | MarkSpec,
>(item: T, priority: number): T {
  setMetadata(item, { priority });

  return item;
}

export function collection<T extends CollectionType>(collection: T): T {
  return collection;
}

type PluginFactoryContext = {
  schema: Schema;
};

type PluginFactory =
  | PMPlugin
  | PMPlugin[]
  | ((options: PluginFactoryContext) => PMPlugin | PMPlugin[] | null);

export type MarkdownConfig = {
  nodes?: Record<string, MarkdownNodeConfig>;
  marks?: Record<string, MarkdownMarkConfig>;
};

export type MarkdownNodeConfig = {
  toMarkdown: UnnestObjValue<MarkdownSerializer['nodes']>;
  parseMarkdown?: MarkdownParser['tokens'];
};

type UnnestObjValue<T> = T extends { [k: string]: infer U } ? U : never;

export type MarkdownMarkConfig = {
  toMarkdown: UnnestObjValue<MarkdownSerializer['marks']>;
  parseMarkdown?: MarkdownParser['tokens'];
};

function mergeObjectsWithDuplicateCheck<T>(
  objA: Record<string, T> | undefined,
  objB: Record<string, T> | undefined,
  context: string,
  allowOverride = false,
  debug = false,
): Record<string, T> {
  if (!objA) {
    return objB || {};
  }
  if (!objB) {
    return objA;
  }

  const result: Record<string, T> = { ...objA };

  for (const [key, value] of Object.entries(objB)) {
    if (key in result) {
      const message = `Duplicate key "${key}" found in ${context}`;
      if (!allowOverride) {
        throw new Error(message);
      }
      debug && console.warn(message);
    }
    result[key] = value;
  }

  return result;
}

function mergeMarkdownConfigs(
  configA?: MarkdownConfig,
  configB?: MarkdownConfig,
  allowOverride = false,
  debug = false,
): MarkdownConfig {
  if (configA == null && configB == null) {
    return {
      nodes: {},
      marks: {},
    };
  }

  return {
    nodes: mergeObjectsWithDuplicateCheck(
      configA?.nodes,
      configB?.nodes,
      'markdown.nodes',
      allowOverride,
      debug,
    ),
    marks: mergeObjectsWithDuplicateCheck(
      configA?.marks,
      configB?.marks,
      'markdown.marks',
      allowOverride,
      debug,
    ),
  };
}

function stableSort<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
  return array
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const result = compareFn(a.item, b.item);
      return result === 0 ? a.index - b.index : result;
    })
    .map(({ item }) => item);
}

function resolveSpecs<T extends NodeSpec | MarkSpec>({
  type,
  collections,
  allowOverride,
  getSpecs,
  debug = getGlobalConfig().debug,
}: {
  type: 'node' | 'mark';
  collections: CollectionType[];
  allowOverride: boolean;
  debug?: boolean;
  getSpecs: (collection: CollectionType) => Record<string, T> | undefined;
}) {
  type SortInfo = {
    key: string;
    spec: T;
    priority: number;
    collectionId: string;
  };
  const unsortedItems: SortInfo[] = collections.flatMap((collection) => {
    return Object.entries(getSpecs(collection) || {}).map(([key, spec]) => ({
      key,
      spec,
      priority: getMetadata(spec)?.priority ?? 0,
      collectionId: collection.id,
    }));
  });

  const sortedItems = stableSort(
    unsortedItems,
    (a, b) => b.priority - a.priority,
  );

  const result: Map<string, SortInfo> = new Map();
  for (const sortInfo of sortedItems) {
    const existing = result.get(sortInfo.key);

    if (!existing) {
      result.set(sortInfo.key, sortInfo);
      continue;
    }

    const message = `${type} key "${sortInfo.key}" from collection "${existing.collectionId}" (priority: ${existing.priority}) is being overridden by collection "${sortInfo.collectionId}" (priority: ${sortInfo.priority}).`;
    if (!allowOverride) {
      throw new Error(message);
    }
    if (sortInfo.priority > existing.priority) {
      result.set(sortInfo.key, sortInfo);
      debug && console.warn(message);
    } else {
      debug &&
        console.warn(
          `Ignoring the new definition of ${type} key "${sortInfo.key}" from collection "${sortInfo.collectionId}" (priority: ${sortInfo.priority}) due to lower priority than existing definition from "${existing.collectionId}" (priority: ${existing.priority}).`,
        );
    }
  }

  const spec = mapToOrderedMap(result, (item): NodeSpec | MarkSpec => {
    return item.spec;
  });

  if (debug) {
    const isNode = type === 'node';
    let message = `\n=== ${isNode ? 'Node' : 'Mark'} Order ===`;
    let index = 0;
    result.forEach((item) => {
      const metadata = getMetadata(item.spec);
      const p = metadata?.priority ? `(priority:${metadata?.priority})` : '';
      message += `\n${index++ + 1}. ${item.collectionId}:${item.key} ${p}`;
    });
    console.log(message);
  }

  return spec;
}

export function resolve(
  collections: CollectionType[] | Record<string, CollectionType>,
  // allows overriding of nodes and marks
  allowOverride = false,
  debug = false,
) {
  const normalizedCollections: CollectionType[] = Array.isArray(collections)
    ? collections
    : Object.values(collections);

  const resolvePlugins = (ctx: PluginFactoryContext) => {
    const unsortedPlugins = normalizedCollections.flatMap((collection) => {
      const normalize = (
        plugin: PMPlugin | (PMPlugin | null)[] | null,
      ): PMPlugin[] => {
        return (Array.isArray(plugin) ? plugin : [plugin]).filter(
          (r) => r != null,
        );
      };

      const flatPlugins = Object.values(collection.plugin || {}).flatMap(
        (pluginFactory) => {
          const plugins =
            typeof pluginFactory === 'function'
              ? pluginFactory(ctx)
              : pluginFactory;
          return normalize(plugins);
        },
      );

      return flatPlugins;
    });

    const sortedPlugins = stableSort(unsortedPlugins, (a, b) => {
      const priorityA = getMetadata(a)?.priority ?? 0;
      const priorityB = getMetadata(b)?.priority ?? 0;
      return priorityB - priorityA;
    });

    if (debug) {
      let message = '\n=== Plugin Order (Most Important First) ===';
      sortedPlugins.forEach((plugin, index) => {
        const metadata = getMetadata(plugin);
        const key = (plugin as any).spec?.key?.key ?? 'unknown';
        const p = metadata?.priority ? `(priority:${metadata?.priority})` : '';
        const debugInfo = metadata?.debugInfo ? ` [${metadata.debugInfo}]` : '';
        message += `\n${index + 1}. ${key} ${p}${debugInfo}`;
      });
      console.log(message);
    }

    return sortedPlugins.map((plugin) => {
      return plugin;
    });
  };

  const resolveMarkdown = () => {
    return normalizedCollections.reduce<MarkdownConfig>(
      (acc, collection) => {
        if (collection.markdown) {
          return mergeMarkdownConfigs(
            acc,
            collection.markdown,
            allowOverride,
            debug,
          );
        }
        return acc;
      },
      { nodes: {}, marks: {} },
    );
  };

  return {
    resolvePlugins,
    get nodes(): OrderedMap<NodeSpec> {
      return resolveSpecs({
        type: 'node',
        collections: normalizedCollections,
        allowOverride,
        debug,
        getSpecs: (collection) => collection.nodes,
      }) as OrderedMap<NodeSpec>;
    },
    get marks(): OrderedMap<MarkSpec> {
      return resolveSpecs({
        type: 'mark',
        collections: normalizedCollections,
        allowOverride,
        debug,
        getSpecs: (collection) => collection.marks,
      }) as OrderedMap<MarkSpec>;
    },
    get markdown() {
      return resolveMarkdown();
    },
  };
}

function mapToOrderedMap<T, R>(
  map: Map<string, T>,
  transform: (value: T) => R,
): OrderedMap<R> {
  let base = OrderedMap.from<R>({});

  for (const [key, value] of map) {
    base = base.addToEnd(key, transform(value));
  }
  return base;
}
export const PRIORITY = {
  baseSpec: 100,
  baseUndoInputRuleKey: 100,
  suggestionKey: 100,
  paragraphSpec: 95,
  listSpec: 80,
  high: 50,
  medium: 25,
  low: 10,

  // -100 to allow default user keymap with 0 priority to run first
  baseKeymap: -100,
};
