const _check = Symbol();

export class Extension {
  static create(obj) {
    const {
      name,
      editorSpecs = [],
      editorPlugins = [],
      highPriorityEditorPlugins = [],
      markdownItPlugins = [],
      editorReactComponent,
      renderReactNodeView,
      ...remainingFields
    } = obj;

    if (Object.keys(remainingFields).length > 0) {
      throw new Error(
        `Extension: the following fields are not recognized ${Object.keys(
          remainingFields,
        ).join(',')}`,
      );
    }

    if (!name) {
      throw new Error('Extension: name is required');
    }
    if (!Array.isArray(editorSpecs)) {
      throw new Error('Extension: editorSpecs must be an array');
    }

    if (!Array.isArray(editorPlugins)) {
      throw new Error('Extension: editorPlugins must be an array');
    }

    if (!Array.isArray(highPriorityEditorPlugins)) {
      throw new Error('Extension: highPriorityEditorPlugins must be an array');
    }

    if (!Array.isArray(markdownItPlugins)) {
      throw new Error('Extension: markdownItPlugins must be an array');
    }

    if (
      renderReactNodeView &&
      Object.values(renderReactNodeView).some((r) => typeof r !== 'function')
    ) {
      throw new Error(
        'Extension: renderReactNodeView must be an Object<string, function> where the function returns a react element',
      );
    }

    if (editorReactComponent) {
    }

    return new Extension(obj, _check);
  }

  constructor(obj, check) {
    if (check !== _check) {
      throw new Error('Instantiate class via `Extension.create({})`');
    }

    this._args = obj;
    this.name = obj.name;
    this.editorSpecs = obj.editorSpecs;
    this.editorPlugins = obj.editorPlugins;
    this.highPriorityEditorPlugins = obj.highPriorityEditorPlugins;
    this.markdownItPlugins = obj.markdownItPlugins;
    this.editorReactComponent = obj.editorReactComponent;
    this.renderReactNodeView = obj.renderReactNodeView;
  }
}
