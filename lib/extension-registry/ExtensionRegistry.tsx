import React from 'react';

import type { RawSpecs } from '@bangle.dev/core';
import { SpecRegistry } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';
import type { RenderNodeViewsFunction as BangleRenderNodeViewsFunction } from '@bangle.dev/react';

import type {
  ActionDefinitionType,
  ActionHandler,
  ActionKeybindingMapping,
  ActionNameType,
  EditorWatchPluginState,
} from '@bangle.io/shared-types';

import { ApplicationConfig, EditorConfig, Extension } from './Extension';
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
  private actionKeybindingMapping: ActionKeybindingMapping;
  private sidebars: Exclude<ApplicationConfig['sidebars'], undefined>;

  private editorWatchPluginStates: Exclude<
    EditorConfig['watchPluginStates'],
    undefined
  >;

  private noteSidebarWidgets: Exclude<
    ApplicationConfig['noteSidebarWidgets'],
    undefined
  >;

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
    this.editorWatchPluginStates = filterFlatMap(
      this.editorConfig,
      'watchPluginStates',
    );
    this.registeredActions = filterFlatMap(applicationConfig, 'actions');
    this.sidebars = filterFlatMap(applicationConfig, 'sidebars');
    this.noteSidebarWidgets = filterFlatMap(
      applicationConfig,
      'noteSidebarWidgets',
    );

    this.actionKeybindingMapping = this._getActionKeybindingMapping();
  }
  private validate() {
    if (
      new Set(this.extensions.filter((r) => Boolean(r.name)).map((r) => r.name))
        .size !== this.extensions.length
    ) {
      throw new Error('Extension name must be unique');
    }
  }

  private _getActionKeybindingMapping(): ActionKeybindingMapping {
    const actions = this.getRegisteredActions()
      .filter((r) => typeof r.keybinding === 'string')
      .map((r): [ActionNameType, string] => [r.name, r.keybinding!]);

    return Object.fromEntries(actions);
  }

  renderReactNodeViews({
    nodeViewRenderArg,
  }: {
    nodeViewRenderArg: Parameters<BangleRenderNodeViewsFunction>[0];
  }): React.ReactNode {
    return this.renderReactNodeViewLookup[nodeViewRenderArg.node.type.name]?.({
      nodeViewRenderArg,
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

  getNoteSidebarWidgets() {
    return this.noteSidebarWidgets;
  }

  getActionKeybindingMapping() {
    return this.actionKeybindingMapping;
  }

  getEditorWatchPluginStates(): EditorWatchPluginState[] {
    return this.editorWatchPluginStates;
  }

  renderExtensionEditorComponents = () => {
    const result = this.editorConfig
      .map((e) => {
        const { ReactComponent } = e;
        if (ReactComponent) {
          return <ReactComponent key={e.name} />;
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
              registerActionHandler={this.registerActionHandler}
            />
          );
        }
        return undefined;
      })
      .filter((e): e is JSX.Element => Boolean(e));

    return result;
  };

  registerActionHandler = (cb: ActionHandler) => {
    this.actionHandlers.add(cb);
    return () => {
      this.actionHandlers.delete(cb);
    };
  };
}
