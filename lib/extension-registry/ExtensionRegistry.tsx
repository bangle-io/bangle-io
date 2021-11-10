import React from 'react';

import type { RawSpecs } from '@bangle.dev/core';
import { SpecRegistry } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';
import type { RenderNodeViewsFunction as BangleRenderNodeViewsFunction } from '@bangle.dev/react';

import {
  ActionDefinitionType,
  ActionHandler,
  ActionNameType,
  ApplicationConfig,
  EditorConfig,
  Extension,
} from './Extension';
import { ExtensionPaletteType } from './UniversalPaletteType';

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

  initialScrollPos = ({
    wsPath,
    editorId,
  }: {
    wsPath: string;
    editorId: number;
  }) => {
    for (const ext of this.extensions) {
      const result = ext.editor?.initialScrollPos?.({
        wsPath,
        editorId,
      });
      if (result != null) {
        return result;
      }
    }

    return undefined;
  };

  initialSelection = ({
    wsPath,
    editorId,
    doc,
  }: {
    wsPath: string;
    editorId: number;
    doc: Node;
  }) => {
    for (const ext of this.extensions) {
      const result = ext.editor?.initialSelection?.({
        wsPath,
        editorId,
        doc,
      });
      if (result != null) {
        return result;
      }
    }
    return undefined;
  };
}

export class ExtensionRegistry {
  specRegistry: SpecRegistry;
  // TODO move this to a method
  markdownItPlugins: any[];
  private renderReactNodeViewLookup: Exclude<
    EditorConfig['renderReactNodeView'],
    undefined
  >;
  private palettes: ExtensionPaletteType[];
  private palettesLookup: Record<string, ExtensionPaletteType>;
  private actionHandlers: Set<ActionHandler>;
  private registeredActions: ActionDefinitionType[];
  private editorConfig: EditorConfig[];

  private sidebars: Exclude<ApplicationConfig['sidebars'], undefined>;
  public editor: EditorHandlers;

  public extensionsInitialState: { [name: string]: any };
  constructor(
    private extensions: Extension[] = [],
    // TODO move this to an extension
    _markdownItPlugins: any[] = [],
  ) {
    this.validate();
    this.editor = new EditorHandlers(this.extensions);

    this.extensionsInitialState = Object.fromEntries(
      extensions.map((r) => [r.name, r.initialState]),
    );

    this.editorConfig = extensions.map((e) => e.editor);
    this.specRegistry = new SpecRegistry([
      ...filterFlatMap<RawSpecs>(this.editorConfig, 'specs'),
    ]);
    this.markdownItPlugins = [
      ..._markdownItPlugins,
      ...filterFlatMap(this.editorConfig, 'markdownItPlugins'),
    ];
    this.renderReactNodeViewLookup = Object.fromEntries(
      filterFlatMap<any>(
        this.editorConfig,
        'renderReactNodeView',
        false,
      ).flatMap((obj) => Object.entries(obj)),
    );

    const applicationConfig = extensions.map((e) => e.application);
    this.palettes = filterFlatMap(applicationConfig, 'palettes');
    this.palettesLookup = Object.fromEntries(
      this.palettes.map((obj) => [obj.type, obj]),
    );

    this.actionHandlers = new Set();
    this.registeredActions = filterFlatMap(applicationConfig, 'actions');
    this.sidebars = filterFlatMap(applicationConfig, 'sidebars');
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
    nodeViewRenderArg: Parameters<BangleRenderNodeViewsFunction>[0];
    wsPath: string;
    editorId: number;
  }): React.ReactNode {
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

  getSidebars() {
    return this.sidebars;
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

  getRegisteredActions(): Readonly<ActionDefinitionType[]> {
    return this.registeredActions;
  }

  getRegisteredActionKeybinding(name: ActionNameType): string | undefined {
    return this.registeredActions.find((a) => a.name === name)?.keybinding;
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

  private _registerActionHandler = (cb: ActionHandler) => {
    this.actionHandlers.add(cb);
    return () => {
      this.actionHandlers.delete(cb);
    };
  };
}
