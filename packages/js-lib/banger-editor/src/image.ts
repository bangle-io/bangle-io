import { type CollectionType, collection } from './common';
import { type Command, NodeSelection, Plugin, PluginKey } from './pm';
import { InputRule, inputRules } from './pm';
import type { NodeSpec, NodeType, PMNode } from './pm';
import type { EditorView } from './pm';
import { type PluginContext, getNodeType, safeInsert } from './pm-utils';

export type ImageConfig = {
  name?: string;
  /**
   * Whether to enable the plugin which handles drag and drop, and paste of image files.
   */
  handleDragAndDrop?: boolean;
  /**
   * The file type to accept when handling drag and drop, and paste of image files.
   */
  acceptFileType?: string;
  /**
   * A function that takes a list of files and returns a promise that resolves to a list of nodes.
   * @default defaultCreateImageNodes
   */
  createImageNodes?: (
    files: File[],
    imageType: NodeType,
    view: EditorView,
  ) => Promise<PMNode[]>;
};

type RequiredConfig = Required<ImageConfig>;

const DEFAULT_CONFIG: RequiredConfig = {
  name: 'image',
  handleDragAndDrop: true,
  acceptFileType: 'image/*',
  createImageNodes: defaultCreateImageNodes,
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
    handleDragAndDrop: pluginHandleDragAndDrop(config),
    handlePaste: pluginHandlePaste(config),
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

function pluginHandleDragAndDrop(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const { name, handleDragAndDrop, acceptFileType, createImageNodes } =
      config;
    const type = getNodeType(schema, name);
    if (!handleDragAndDrop) {
      return null;
    }

    return new Plugin({
      key: new PluginKey(`${name}-drop-paste`),
      props: {
        handleDOMEvents: {
          drop(view, _event) {
            const event = _event as DragEvent;

            if (event.dataTransfer == null) {
              return false;
            }
            const files = getFileData(event.dataTransfer, acceptFileType, true);
            // TODO should we handle all drops but just show error?
            // returning false here would just default to native behaviour
            // But then any drop handler would fail to work.
            if (!files || files.length === 0) {
              return false;
            }
            event.preventDefault();
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });

            createImageNodes(files, type, view).then((imageNodes) => {
              addImagesToView(
                view,
                coordinates == null ? undefined : coordinates.pos,
                imageNodes,
              );
            });

            return true;
          },
        },
      },
    });
  };
}

function pluginHandlePaste(config: RequiredConfig) {
  return ({ schema }: PluginContext) => {
    const { name, acceptFileType, createImageNodes } = config;
    const type = getNodeType(schema, name);

    return new Plugin({
      key: new PluginKey(`${name}-drop-paste`),
      props: {
        handlePaste: (view: EditorView, rawEvent: any) => {
          const event = rawEvent;
          if (!event.clipboardData) {
            return false;
          }
          const files = getFileData(event.clipboardData, acceptFileType, true);
          if (!files || files.length === 0) {
            return false;
          }
          createImageNodes(files, type, view).then((imageNodes) => {
            addImagesToView(view, view.state.selection.from, imageNodes);
          });

          return true;
        },
      },
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

// HELPERS
async function defaultCreateImageNodes(
  files: File[],
  imageType: NodeType,
  _view: EditorView,
) {
  const resolveBinaryStrings = await Promise.all(
    files.map((file) => readFileAsBinaryString(file)),
  );
  return resolveBinaryStrings.map((binaryStr) => {
    return imageType.create({
      src: binaryStr,
    });
  });
}

function addImagesToView(
  view: EditorView,
  pos: number | undefined,
  imageNodes: PMNode[],
) {
  for (const node of imageNodes) {
    const { tr } = view.state;
    const newTr = safeInsert(node, pos)(tr);

    if (newTr === tr) {
      continue;
    }

    view.dispatch(newTr);
  }
}

function readFileAsBinaryString(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const onLoadBinaryString: FileReader['onload'] = (readerEvt) => {
      if (typeof readerEvt.target?.result === 'string') {
        const binarySrc = btoa(readerEvt.target.result);
        resolve(`data:${file.type};base64,${binarySrc}`);
      } else {
        reject(new Error(`Error reading file${file.name}`));
      }
    };
    const onLoadDataUrl: FileReader['onload'] = (readerEvt) => {
      if (typeof readerEvt.target?.result === 'string') {
        resolve(readerEvt.target.result);
      } else {
        reject(new Error(`Error reading file${file.name}`));
      }
    };
    reader.onerror = () => {
      reject(new Error(`Error reading file${file.name}`));
    };

    // Some browsers do not support this
    if ('readAsDataURL' in reader) {
      reader.onload = onLoadDataUrl;
      reader.readAsDataURL(file);
    } else {
      // @ts-ignore reader was incorrectly inferred as 'never'
      reader.onload = onLoadBinaryString;
      // @ts-ignore
      reader.readAsBinaryString(file);
    }
  });
}

function getFileData(data: DataTransfer, accept: string, multiple: boolean) {
  const dragDataItems = getMatchingItems(data.items, accept, multiple);
  const files: File[] = [];

  dragDataItems.forEach((item) => {
    const file = item?.getAsFile();
    if (file == null) {
      return;
    }
    files.push(file);
  });

  return files;
}

function getMatchingItems(
  list: DataTransferItemList,
  accept: string,
  multiple: boolean,
) {
  const dataItems = Array.from(list);
  let results: DataTransferItem[] = [];

  // Return the first item (or undefined) if our filter is for all files
  if (accept === '') {
    results = dataItems.filter((item) => item.kind === 'file');
    return multiple ? results : [results[0]];
  }

  const accepts = accept
    .toLowerCase()
    .split(',')
    .map((accept) => {
      return accept.split('/').map((part) => part.trim());
    })
    .filter((acceptParts) => acceptParts.length === 2); // Filter invalid values

  const predicate = (item: DataTransferItem) => {
    if (item.kind !== 'file') {
      return false;
    }

    const [typeMain, typeSub] = item.type
      .toLowerCase()
      .split('/')
      .map((s) => s.trim());

    for (const [acceptMain, acceptSub] of accepts) {
      // Look for an exact match, or a partial match if * is accepted, eg image/*.
      if (
        typeMain === acceptMain &&
        (acceptSub === '*' || typeSub === acceptSub)
      ) {
        return true;
      }
    }
    return false;
  };

  results = dataItems.filter(predicate);
  if (multiple === false && results[0]) {
    results = [results[0]];
  }

  return results;
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
