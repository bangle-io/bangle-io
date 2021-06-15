const _check = Symbol();

export class Extension {
  static create(obj) {
    const {
      name,
      editor,
      editorSpecs = [],
      editorPlugins = [],
      highPriorityEditorPlugins = [],
      markdownItPlugins = [],
      palettes = [],
      EditorReactComponent,
      ApplicationReactComponent,
      renderReactNodeView,
      actions = [],
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

    if (!Array.isArray(palettes)) {
      throw new Error('Extension: palettes must be an array');
    }

    if (!palettes.every((r) => r.type.startsWith(name + '/'))) {
      throw new Error(
        "Extension: palette's type must start with extension's name followed by '/'. Example 'my-extension-name/my-palette-type' ",
      );
    }

    if (
      !Array.isArray(actions) ||
      actions.some((a) => typeof a.name !== 'string')
    ) {
      throw new Error(
        'Actions must be an array of object, where each item has a name field',
      );
    }

    if (actions.some((a) => !a.name.startsWith('@action/' + name + '/'))) {
      throw new Error(
        `An action must have a name with the following schema @action/<extension_name/xyz. For example '@action/my-extension/hello-world'`,
      );
    }
    if (actions.length !== new Set(actions.map((r) => r.name)).size) {
      throw new Error('Action name must be unique');
    }

    if (
      renderReactNodeView &&
      Object.values(renderReactNodeView).some((r) => typeof r !== 'function')
    ) {
      throw new Error(
        'Extension: renderReactNodeView must be an Object<string, function> where the function returns a react element',
      );
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
    this.EditorReactComponent = obj.EditorReactComponent;
    this.ApplicationReactComponent = obj.ApplicationReactComponent;
    this.renderReactNodeView = obj.renderReactNodeView;
    this.editor = obj.editor;
    this.palettes = obj.palettes;
    this.actions = obj.actions;
  }
}
