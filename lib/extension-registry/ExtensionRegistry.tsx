import React from 'react';

import { SpecRegistry } from '@bangle.dev/core';
import type { RenderNodeViewsFunction as BangleRenderNodeViewsFunction } from '@bangle.dev/react';

import type { Slice } from '@bangle.io/create-store';
import type { EffectCreator, Slice as NsmSlice } from '@bangle.io/nsm-3';
import type {
  EditorWatchPluginState,
  SerialOperationDefinitionType,
  SerialOperationHandler,
  SerialOperationKeybindingMapping,
  SerialOperationNameType,
} from '@bangle.io/shared-types';
import type { BaseStorageProvider } from '@bangle.io/storage';

import type {
  ApplicationConfig,
  EditorConfig,
  Extension,
  ThemeConfig,
} from './Extension';

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
  renderExtensionEditorComponents = () => {
    const result = this._editorConfig
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
    const result = this._extensions
      .map((extension) => {
        const { ReactComponent } = extension.application ?? {};

        if (ReactComponent) {
          return <ReactComponent key={extension.name} />;
        }

        return undefined;
      })
      .filter((e): e is JSX.Element => Boolean(e));

    return result;
  };

  registerSerialOperationHandler = (cb: SerialOperationHandler) => {
    this._serialOperationHandlers.add(cb);

    return () => {
      this._serialOperationHandlers.delete(cb);
    };
  };

  private _dialogs: Exclude<ApplicationConfig['dialogs'], undefined>;

  private _editorConfig: EditorConfig[];
  private _editorWatchPluginStates: Exclude<
    EditorConfig['watchPluginStates'],
    undefined
  >;

  private _noteFormatProviders: {
    [noteFormatProviderName: string]: Exclude<
      ApplicationConfig['noteFormatProvider'],
      undefined
    >;
  };

  private _noteSidebarWidgets: Exclude<
    ApplicationConfig['noteSidebarWidgets'],
    undefined
  >;

  private _nsmEffects: EffectCreator[];
  private _nsmSlices: Array<NsmSlice<any, any, any>>;

  private _onStorageErrorHandlers: {
    [storageProviderName: string]: Exclude<
      ApplicationConfig['onStorageError'],
      undefined
    >;
  };

  private _operationHandlers: Array<
    Exclude<ApplicationConfig['operationHandler'], undefined>
  >;

  private _operationKeybindingMapping: SerialOperationKeybindingMapping;
  private _registeredSerialOperations: SerialOperationDefinitionType[];
  private _renderReactNodeViewLookup: Exclude<
    EditorConfig['renderReactNodeView'],
    undefined
  >;

  private _serialOperationHandlers: Set<SerialOperationHandler>;
  private _sidebars: Exclude<ApplicationConfig['sidebars'], undefined>;
  private _slices: Slice[];

  private _storageProviders: {
    [storageProviderName: string]: Exclude<
      ApplicationConfig['storageProvider'],
      undefined
    >;
  };

  private _themes: ThemeConfig[];

  constructor(
    private _extensions: Extension[] = [],
    // TODO move this to an extension
    _markdownItPlugins: any[] = [],
  ) {
    this._validate();

    this._editorConfig = _extensions
      .map((e) => e.editor)
      .filter((r): r is EditorConfig => Boolean(r));

    this.specRegistry = new SpecRegistry([
      ...filterFlatMap(this._editorConfig, 'specs'),
    ]);
    this.markdownItPlugins = [
      ..._markdownItPlugins,
      ...filterFlatMap(this._editorConfig, 'markdownItPlugins'),
    ];
    this._renderReactNodeViewLookup = Object.fromEntries(
      filterFlatMap(this._editorConfig, 'renderReactNodeView', false).flatMap(
        (obj) => Object.entries(obj),
      ),
    );

    this._themes = filterFlatMap(_extensions, 'themes', true);

    const applicationConfig = _extensions
      .map((e) => e.application)
      .filter((r): r is ApplicationConfig => Boolean(r));

    this._serialOperationHandlers = new Set();

    this._editorWatchPluginStates = filterFlatMap(
      this._editorConfig,
      'watchPluginStates',
    );
    this._registeredSerialOperations = filterFlatMap(
      applicationConfig,
      'operations',
    );
    this._sidebars = filterFlatMap(applicationConfig, 'sidebars');
    assertUniqueName(this._sidebars, 'sidebars');

    this._dialogs = filterFlatMap(applicationConfig, 'dialogs');
    assertUniqueName(this._dialogs, 'dialogs');

    this._noteSidebarWidgets = filterFlatMap(
      applicationConfig,
      'noteSidebarWidgets',
    );
    assertUniqueName(this._noteSidebarWidgets, 'noteSidebarWidgets');

    this._slices = filterFlatMap(applicationConfig, 'slices');
    this._nsmSlices = filterFlatMap(applicationConfig, 'nsmSlices');
    this._nsmEffects = filterFlatMap(applicationConfig, 'nsmEffects');

    this._operationHandlers = _extensions
      .map((e) => e.application?.operationHandler)
      .filter(
        (
          operationHandler,
        ): operationHandler is Exclude<
          ApplicationConfig['operationHandler'],
          undefined
        > => operationHandler != null,
      );

    this._operationKeybindingMapping =
      this._getSerialOperationKeybindingMapping();

    const storageProviders = filterFlatMap(
      applicationConfig,
      'storageProvider',
    );
    assertUniqueName(storageProviders, 'storageProviders');
    this._storageProviders = Object.fromEntries(
      storageProviders.map((r) => [r.name, r]),
    );

    this._noteFormatProviders = Object.fromEntries(
      filterFlatMap(applicationConfig, 'noteFormatProvider').map((r) => [
        r.name,
        r,
      ]),
    );

    this._onStorageErrorHandlers = Object.fromEntries(
      applicationConfig
        .filter((r) => Boolean(r.storageProvider) && Boolean(r.onStorageError))
        .map((a) => [a.storageProvider!.name, a.onStorageError!]),
    );
  }

  getAllStorageProviders(): BaseStorageProvider[] {
    return Object.values(this._storageProviders);
  }

  getDialog(name: string) {
    return this._dialogs.find((d) => d.name === name);
  }

  getEditorWatchPluginStates(): EditorWatchPluginState[] {
    return this._editorWatchPluginStates;
  }

  getNoteFormatProvider(name: string) {
    return this._noteFormatProviders[name];
  }

  getNoteSidebarWidgets() {
    return this._noteSidebarWidgets;
  }

  getNsmEffects() {
    return this._nsmEffects;
  }

  getNsmSlices() {
    return this._nsmSlices;
  }

  getOnStorageErrorHandlers(name: string) {
    return this._onStorageErrorHandlers[name];
  }

  getOperationHandlers() {
    return this._operationHandlers;
  }

  getPlugins() {
    return [
      ...filterFlatMap(this._editorConfig, 'highPriorityPlugins'),
      ...filterFlatMap(this._editorConfig, 'plugins'),
    ];
  }

  getRegisteredOperationKeybinding(
    name: SerialOperationNameType,
  ): string | undefined {
    return this._registeredSerialOperations.find((a) => a.name === name)
      ?.keybinding;
  }

  getRegisteredOperations(): Readonly<SerialOperationDefinitionType[]> {
    return this._registeredSerialOperations;
  }

  getSerialOperationHandlers() {
    return this._serialOperationHandlers;
  }

  getSerialOperationKeybindingMapping() {
    return this._operationKeybindingMapping;
  }

  getSidebars() {
    return this._sidebars;
  }

  getSlices() {
    return this._slices;
  }

  getStorageProvider(name: string) {
    return this._storageProviders[name];
  }

  getThemes() {
    return this._themes;
  }

  isExtensionDefined(name: string) {
    return this._extensions.some((e) => e.name === name);
  }

  renderReactNodeViews({
    nodeViewRenderArg,
  }: {
    nodeViewRenderArg: Parameters<BangleRenderNodeViewsFunction>[0];
  }): React.ReactNode {
    return this._renderReactNodeViewLookup[nodeViewRenderArg.node.type.name]?.({
      nodeViewRenderArg,
    });
  }

  private _getSerialOperationKeybindingMapping(): SerialOperationKeybindingMapping {
    const operations = this.getRegisteredOperations()
      .filter((r) => typeof r.keybinding === 'string')
      .map((r): [SerialOperationNameType, string] => [r.name, r.keybinding!]);

    return Object.fromEntries(operations);
  }

  private _validate() {
    assertUniqueName(this._extensions, 'extensions');
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
