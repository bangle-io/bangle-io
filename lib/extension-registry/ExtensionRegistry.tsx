import React from 'react';

import { SpecRegistry } from '@bangle.dev/core';
import type { RenderNodeViewsFunction as BangleRenderNodeViewsFunction } from '@bangle.dev/react';

import { Slice } from '@bangle.io/create-store';
import type {
  EditorWatchPluginState,
  SerialOperationDefinitionType,
  SerialOperationHandler,
  SerialOperationKeybindingMapping,
  SerialOperationNameType,
} from '@bangle.io/shared-types';

import { ApplicationConfig, EditorConfig, Extension } from './Extension';

type Unnest<T> = T extends Array<infer U> ? U : T;

function filterFlatMap<R, K extends keyof R>(
  array: R[],
  field: K,
  flatten = true,
): Array<Unnest<Exclude<R[K], undefined>>> {
  let items = array.filter((item) => Boolean(item[field]));

  if (flatten) {
    return items.flatMap((item) => item[field]) as any;
  }

  return items.map((item) => item[field]) as any;
}

export class ExtensionRegistry {
  specRegistry: SpecRegistry;
  // TODO move this to a method
  markdownItPlugins: any[];
  private renderReactNodeViewLookup: Exclude<
    EditorConfig['renderReactNodeView'],
    undefined
  >;

  private serialOperationHandlers: Set<SerialOperationHandler>;
  private registeredSerialOperations: SerialOperationDefinitionType[];
  private editorConfig: EditorConfig[];
  private operationKeybindingMapping: SerialOperationKeybindingMapping;
  private operationHandlers: Array<
    Exclude<ApplicationConfig['operationHandler'], undefined>
  >;

  private sidebars: Exclude<ApplicationConfig['sidebars'], undefined>;
  private storageProviders: {
    [storageProviderName: string]: Exclude<
      ApplicationConfig['storageProvider'],
      undefined
    >;
  };

  private noteFormatProviders: {
    [noteFormatProviderName: string]: Exclude<
      ApplicationConfig['noteFormatProvider'],
      undefined
    >;
  };

  private slices: Array<Slice<any, any>>;
  private onStorageErrorHandlers: {
    [storageProviderName: string]: Exclude<
      ApplicationConfig['onStorageError'],
      undefined
    >;
  };

  private editorWatchPluginStates: Exclude<
    EditorConfig['watchPluginStates'],
    undefined
  >;

  private noteSidebarWidgets: Exclude<
    ApplicationConfig['noteSidebarWidgets'],
    undefined
  >;

  private dialogs: Exclude<ApplicationConfig['dialogs'], undefined>;

  extensionsInitialState: { [name: string]: any };
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

  renderApplicationComponents = () => {
    const result = this.extensions
      .map((extension) => {
        const { ReactComponent } = extension.application;

        if (ReactComponent) {
          return <ReactComponent key={extension.name} />;
        }

        return undefined;
      })
      .filter((e): e is JSX.Element => Boolean(e));

    return result;
  };

  registerSerialOperationHandler = (cb: SerialOperationHandler) => {
    this.serialOperationHandlers.add(cb);

    return () => {
      this.serialOperationHandlers.delete(cb);
    };
  };

  constructor(
    private extensions: Extension[] = [],
    // TODO move this to an extension
    _markdownItPlugins: any[] = [],
  ) {
    this.validate();

    this.extensionsInitialState = Object.fromEntries(
      extensions.map((r) => [r.name, r.initialState]),
    );

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
        (obj) => Object.entries(obj),
      ),
    );

    const applicationConfig = extensions.map((e) => e.application);

    this.serialOperationHandlers = new Set();

    this.editorWatchPluginStates = filterFlatMap(
      this.editorConfig,
      'watchPluginStates',
    );
    this.registeredSerialOperations = filterFlatMap(
      applicationConfig,
      'operations',
    );
    this.sidebars = filterFlatMap(applicationConfig, 'sidebars');
    assertUniqueName(this.sidebars, 'sidebars');

    this.dialogs = filterFlatMap(applicationConfig, 'dialogs');
    assertUniqueName(this.dialogs, 'dialogs');

    this.noteSidebarWidgets = filterFlatMap(
      applicationConfig,
      'noteSidebarWidgets',
    );
    assertUniqueName(this.noteSidebarWidgets, 'noteSidebarWidgets');

    this.slices = filterFlatMap(applicationConfig, 'slices');
    this.operationHandlers = extensions
      .map((e) => e.application.operationHandler)
      .filter(
        (
          operationHandler,
        ): operationHandler is Exclude<
          ApplicationConfig['operationHandler'],
          undefined
        > => operationHandler != null,
      );

    this.operationKeybindingMapping =
      this._getSerialOperationKeybindingMapping();

    const storageProviders = filterFlatMap(
      applicationConfig,
      'storageProvider',
    );
    assertUniqueName(storageProviders, 'storageProviders');
    this.storageProviders = Object.fromEntries(
      storageProviders.map((r) => [r.name, r]),
    );

    this.noteFormatProviders = Object.fromEntries(
      filterFlatMap(applicationConfig, 'noteFormatProvider').map((r) => [
        r.name,
        r,
      ]),
    );

    this.onStorageErrorHandlers = Object.fromEntries(
      applicationConfig
        .filter((r) => Boolean(r.storageProvider) && Boolean(r.onStorageError))
        .map((a) => [a.storageProvider!.name, a.onStorageError!]),
    );
  }

  getDialog(name: string) {
    return this.dialogs.find((d) => d.name === name);
  }

  getEditorWatchPluginStates(): EditorWatchPluginState[] {
    return this.editorWatchPluginStates;
  }

  getNoteFormatProvider(name: string) {
    return this.noteFormatProviders[name];
  }

  getNoteSidebarWidgets() {
    return this.noteSidebarWidgets;
  }

  getOnStorageErrorHandlers(name: string) {
    return this.onStorageErrorHandlers[name];
  }

  getOperationHandlers() {
    return this.operationHandlers;
  }

  getPlugins() {
    return [
      ...filterFlatMap(this.editorConfig, 'highPriorityPlugins'),
      ...filterFlatMap(this.editorConfig, 'plugins'),
    ];
  }

  getRegisteredOperationKeybinding(
    name: SerialOperationNameType,
  ): string | undefined {
    return this.registeredSerialOperations.find((a) => a.name === name)
      ?.keybinding;
  }

  getRegisteredOperations(): Readonly<SerialOperationDefinitionType[]> {
    return this.registeredSerialOperations;
  }

  getSerialOperationHandlers() {
    return this.serialOperationHandlers;
  }

  getSerialOperationKeybindingMapping() {
    return this.operationKeybindingMapping;
  }

  getSidebars() {
    return this.sidebars;
  }

  getSlices() {
    return this.slices;
  }

  getStorageProvider(name: string) {
    return this.storageProviders[name];
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

  private validate() {
    assertUniqueName(this.extensions, 'extensions');
  }

  private _getSerialOperationKeybindingMapping(): SerialOperationKeybindingMapping {
    const operations = this.getRegisteredOperations()
      .filter((r) => typeof r.keybinding === 'string')
      .map((r): [SerialOperationNameType, string] => [r.name, r.keybinding!]);

    return Object.fromEntries(operations);
  }
}

function assertUniqueName<T extends { name: string }>(
  items: T[],
  debugString: string,
) {
  if (new Set(items.map((r) => r.name)).size !== items.length) {
    throw new Error(
      `In "${debugString}" there is an existing entity with same name.`,
    );
  }
}
