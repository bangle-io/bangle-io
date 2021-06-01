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

  renderReactNodeViews(nodeViewRenderArg) {
    return this._renderReactNodeViewLookup[nodeViewRenderArg.node.type.name]?.(
      nodeViewRenderArg,
      this,
    );
  }

  getPlugins() {
    return [
      ...filterFlatMap(this._extensions, 'highPriorityEditorPlugins'),
      this._getCorePlugins(),
      ...filterFlatMap(this._extensions, 'editorPlugins'),
    ];
  }
}
