import { SpecRegistry } from '@bangle.dev/core/spec-registry';

function filterFlatMap(array, field, flatten = true) {
  let items = array.filter((item) => Boolean(item[field]));
  if (flatten) {
    return items.flatMap((item) => item[field]);
  }
  return items.map((item) => item[field]);
}

export class BangleIOContext {
  constructor({
    coreRawSpecs,
    getCorePlugins,
    extensions = [],
    markdownItPlugins = [],
  }) {
    this._extensions = extensions;
    if (
      new Set(
        this._extensions.filter((r) => Boolean(r.name)).map((r) => r.name),
      ).size !== this._extensions.length
    ) {
      throw new Error('Extension name must be unique');
    }
    this._getCorePlugins = getCorePlugins;
    this.specRegistry = new SpecRegistry([
      ...coreRawSpecs,
      ...filterFlatMap(extensions, 'editorSpecs'),
    ]);
    this.markdownItPlugins = [
      ...markdownItPlugins,
      ...filterFlatMap(extensions, 'markdownItPlugins'),
    ];

    this._renderReactNodeViewLookup = Object.fromEntries(
      filterFlatMap(extensions, 'renderReactNodeView', false).flatMap((obj) =>
        Object.entries(obj),
      ),
    );
  }

  _getExtensionStore(uniqueObj, extension) {
    if (!uniqueObj[extension.name]) {
      uniqueObj[extension.name] = {};
    }
    return uniqueObj[extension.name];
  }

  renderReactNodeViews({ nodeViewRenderArg, wsPath, editorId }) {
    return this._renderReactNodeViewLookup[nodeViewRenderArg.node.type.name]?.({
      nodeViewRenderArg,
      wsPath,
      editorId,
      bangleIOContext: this,
    });
  }

  getPlugins() {
    return [
      ...filterFlatMap(this._extensions, 'highPriorityEditorPlugins'),
      this._getCorePlugins(),
      ...filterFlatMap(this._extensions, 'editorPlugins'),
    ];
  }

  editor = {
    beforeDestroy: ({ uniqueEditorObj, wsPath, editorId }) => {
      for (const ext of this._extensions.filter(
        (e) => e.editor?.beforeDestroy,
      )) {
        ext.editor.beforeDestroy({
          wsPath,
          editorId,
          store: this._getExtensionStore(uniqueEditorObj, ext),
        });
      }
    },
    initialScrollPos: ({
      uniqueEditorObj,
      wsPath,
      editorId,
      scrollParent,
      doc,
    }) => {
      for (const ext of this._extensions) {
        const result = ext.editor?.initialScrollPos?.({
          wsPath,
          editorId,
          scrollParent,
          doc,
          store: this._getExtensionStore(uniqueEditorObj, ext),
        });
        if (result != null) {
          return result;
        }
      }

      return undefined;
    },

    initialSelection: ({ uniqueEditorObj, wsPath, editorId, doc }) => {
      for (const ext of this._extensions) {
        const result = ext.editor?.initialSelection?.({
          wsPath,
          editorId,
          doc,
          store: this._getExtensionStore(uniqueEditorObj, ext),
        });
        if (result != null) {
          return result;
        }
      }
      return undefined;
    },
  };
}
