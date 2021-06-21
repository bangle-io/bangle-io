import { SpecRegistry } from '@bangle.dev/core';
import React from 'react';
import { ApplicationConfig, EditorConfig, Extension } from './Extension';

function filterFlatMap<K>(
  array: any[],
  field: string,
  flatten = true,
): Array<K> {
  let items = array.filter((item) => Boolean(item[field]));
  if (flatten) {
    return items.flatMap((item) => item[field]);
  }
  return items.map((item) => item[field]);
}

class EditorHandlers {
  constructor(private extensions: Extension[]) {}

  private _getExtensionStore(
    uniqueObj: Record<string, any>,
    extension: Extension,
  ) {
    if (!uniqueObj[extension.name]) {
      uniqueObj[extension.name] = {};
    }
    return uniqueObj[extension.name];
  }
  // deprecate this
  beforeDestroy = ({
    uniqueEditorObj,
    wsPath,
    editorId,
  }: {
    uniqueEditorObj: any;
    wsPath: string;
    editorId: number;
  }) => {
    for (const ext of this.extensions.filter((e) => e.editor?.beforeDestroy)) {
      ext.editor.beforeDestroy?.({
        wsPath,
        editorId,
        store: this._getExtensionStore(uniqueEditorObj, ext),
      });
    }
  };

  initialScrollPos = ({
    uniqueEditorObj,
    wsPath,
    editorId,
    scrollParent,
    doc,
  }: {
    uniqueEditorObj: any;
    wsPath: string;
    editorId: number;
    scrollParent: any;
    doc: any;
  }) => {
    for (const ext of this.extensions) {
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
  };

  initialSelection = ({
    uniqueEditorObj,
    wsPath,
    editorId,
    doc,
  }: {
    uniqueEditorObj: any;
    wsPath: string;
    editorId: number;
    doc: any;
  }) => {
    for (const ext of this.extensions) {
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
  };
}

export class ExtensionRegistry {
  // TODO move this to a method
  specRegistry: typeof SpecRegistry;
  // TODO move this to a method
  markdownItPlugins: any[];
  private renderReactNodeViewLookup: Record<string, Function>;
  private palettes: any[];
  private palettesLookup: Record<string, any>;
  private actionHandlers: Set<Function>;
  private registeredActions: any[];
  private editorConfig: EditorConfig[];
  private optionsBarEntries: ApplicationConfig['optionsBar'];
  editor = new EditorHandlers(this.extensions);

  constructor(
    private extensions: Extension[] = [],
    // TODO move this to an extension
    _markdownItPlugins: any[] = [],
  ) {
    this.validate();

    this.editorConfig = extensions.map((e) => e.editor);
    this.specRegistry = new SpecRegistry([
      ...filterFlatMap(this.editorConfig, 'specs'),
    ]);
    this.markdownItPlugins = [
      ..._markdownItPlugins,
      ...filterFlatMap(this.editorConfig, 'markdownItPlugins'),
    ];
    this.renderReactNodeViewLookup = Object.fromEntries(
      filterFlatMap(this.editorConfig, 'renderReactNodeView', false).flatMap(
        (obj) => Object.entries(obj as any),
      ),
    );

    const applicationConfig = extensions.map((e) => e.application);
    this.palettes = filterFlatMap(applicationConfig, 'palettes');
    this.palettesLookup = Object.fromEntries(
      this.palettes.map((obj) => [obj.type, obj]),
    );

    this.actionHandlers = new Set();
    this.registeredActions = filterFlatMap(applicationConfig, 'actions');
    this.optionsBarEntries = filterFlatMap(applicationConfig, 'optionsBar');
  }
  private validate() {
    if (
      new Set(this.extensions.filter((r) => Boolean(r.name)).map((r) => r.name))
        .size !== this.extensions.length
    ) {
      throw new Error('Extension name must be unique');
    }
  }

  renderReactNodeViews({
    nodeViewRenderArg,
    wsPath,
    editorId,
  }: {
    nodeViewRenderArg: any;
    wsPath: string;
    editorId: number;
  }) {
    return this.renderReactNodeViewLookup[nodeViewRenderArg.node.type.name]?.({
      nodeViewRenderArg,
      wsPath,
      editorId,
      extensionRegistry: this,
    });
  }

  getPlugins() {
    return [
      ...filterFlatMap(this.editorConfig, 'highPriorityPlugins'),
      ...filterFlatMap(this.editorConfig, 'plugins'),
    ];
  }

  getPalette(type: string) {
    return this.palettesLookup[type];
  }

  getAllPalettes() {
    return this.palettes;
  }

  paletteParseRawQuery(query: string) {
    return this.palettes.find(
      (palette) => palette.parseRawQuery(query) != null,
    );
  }

  getOptionsBarEntries() {
    return this.optionsBarEntries;
  }

  renderExtensionEditorComponents = ({
    wsPath,
    editorId,
  }: {
    wsPath: string;
    editorId: number;
  }) => {
    const result = this.editorConfig
      .map((e) => {
        const { ReactComponent } = e;
        if (ReactComponent) {
          return (
            <ReactComponent key={e.name} wsPath={wsPath} editorId={editorId} />
          );
        }
        return undefined;
      })
      .filter((e): e is JSX.Element => Boolean(e));
    return result;
  };

  getRegisteredActions() {
    return this.registeredActions;
  }

  getActionHandlers() {
    return this.actionHandlers;
  }

  renderApplicationComponents = () => {
    const result = this.extensions
      .map((extension) => {
        const { ReactComponent } = extension.application;
        if (ReactComponent) {
          return (
            <ReactComponent
              key={extension.name}
              registerActionHandler={this._registerActionHandler}
            />
          );
        }
        return undefined;
      })
      .filter((e): e is JSX.Element => Boolean(e));

    return result;
  };

  private _registerActionHandler = (cb: any) => {
    this.actionHandlers.add(cb);
    return () => {
      this.actionHandlers.delete(cb);
    };
  };
}
