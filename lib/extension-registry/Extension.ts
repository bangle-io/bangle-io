import type React from 'react';

import type { RawSpecs } from '@bangle.dev/core';
import type { RenderNodeViewsFunction as BangleRenderNodeViewsFunction } from '@bangle.dev/react';

import type { ApplicationStore } from '@bangle.io/create-store';
import { Slice } from '@bangle.io/create-store';
import type { AnySlice, EffectCreator } from '@bangle.io/nsm-3';
import { isSlice } from '@bangle.io/nsm-3';
import type {
  DialogType,
  EditorWatchPluginState,
  NoteFormatProvider,
  NoteSidebarWidget,
  NsmStore,
  OnStorageProviderError,
  SerialOperationDefinitionType,
  SerialOperationHandler,
} from '@bangle.io/shared-types';
import type { BaseStorageProvider } from '@bangle.io/storage';

import type { EditorPluginDefinition } from './PluginType';

const _check = Symbol();

export type RenderReactNodeViewCb = (arg: {
  nodeViewRenderArg: Parameters<BangleRenderNodeViewsFunction>[0];
}) => React.ReactNode;

export type RenderReactNodeView = {
  [k: string]: RenderReactNodeViewCb;
};

export interface EditorConfig {
  name: string;
  specs?: RawSpecs[];
  plugins?: EditorPluginDefinition[];
  highPriorityPlugins?: EditorPluginDefinition[];
  markdownItPlugins?: any[];
  ReactComponent?: React.ComponentType<{
    key: string;
  }>;
  renderReactNodeView?: RenderReactNodeView;
  watchPluginStates?: EditorWatchPluginState[];
}

export type RegisterSerialOperationHandlerType = (
  cb: SerialOperationHandler,
) => () => void;

export type SerialOperationHandler2<
  OpType extends SerialOperationDefinitionType,
> = () => {
  handle: (
    serialOperation: { name: OpType['name']; value?: any },
    payload: any,
  ) => boolean | void;
};

export type SerialOperationHandlerNsm<
  OpType extends SerialOperationDefinitionType,
> = () => {
  handle: (
    serialOperation: { name: OpType['name']; value?: any },
    payload: any,
    store: NsmStore,
  ) => boolean | void;
};

export interface ApplicationConfig<
  OpType extends SerialOperationDefinitionType = any,
> {
  name: string;
  ReactComponent?: React.ComponentType<{
    key: string;
  }>;
  operations?: OpType[];
  sidebars?: SidebarType[];
  dialogs?: DialogType[];
  operationHandler?: SerialOperationHandler2<OpType>;
  operationHandlerNsm?: SerialOperationHandler2<OpType>;
  noteSidebarWidgets?: NoteSidebarWidget[];
  slices?: Slice[];
  nsmSlices?: AnySlice[];
  nsmEffects?: EffectCreator[];
  storageProvider?: BaseStorageProvider;
  noteFormatProvider?: NoteFormatProvider;
  // Return true if the error was handled by your callback
  // and false if it cannot be handled
  // Only applicable if your extension is a storage provider
  onStorageError?: OnStorageProviderError;
}

export interface ThemeConfig {
  name: string;
  ownerExtension: string;
  description?: string;
  url: string;
}

export interface SidebarType {
  activitybarIcon: JSX.Element;
  // if provided will be used to decide whether to show the sidebar icon in activitybar
  // or not. If not provided, the icon will always be shown.
  activitybarIconShow?: (wsName: string | undefined) => boolean;
  hint: string;
  name: `sidebar::${string}`;
  ReactComponent: React.ComponentType;
  title: string;
}

interface Config<OpType extends SerialOperationDefinitionType> {
  application: ApplicationConfig<OpType> | undefined;
  editor: EditorConfig | undefined;
  name: string;
  themes: ThemeConfig[] | undefined;
}

export class Extension<OpType extends SerialOperationDefinitionType = any> {
  static create<OpType extends SerialOperationDefinitionType = any>(config: {
    name: string;
    editor?: Omit<EditorConfig, 'name'>;
    application?: Omit<ApplicationConfig<OpType>, 'name'>;
    themes?: Array<Omit<ThemeConfig, 'ownerExtension'>>;
  }) {
    const { name } = config;

    if (!name) {
      throw new Error('Extension: name is required');
    }

    if (!/^[a-z0-9-_@/\.]+$/.test(name)) {
      throw new Error(
        `Extension "${name}": Extension's name can oly have the following characters "a..z" "0..9" "@" "." "-" and "_"`,
      );
    }

    const editor: EditorConfig | undefined = config.editor
      ? Object.assign({}, config.editor, {
          name,
        })
      : undefined;

    const application: ApplicationConfig<OpType> | undefined =
      config.application
        ? Object.assign({}, config.application, { name })
        : undefined;

    const themes: ThemeConfig[] | undefined = config.themes?.map((r) => ({
      ...r,
      ownerExtension: name,
    }));

    if (themes) {
      if (new Set(themes.map((t) => t.name)).size !== themes.length) {
        throw new Error('Theme: names must be unique');
      }

      for (const theme of themes) {
        if (!theme.name) {
          throw new Error('Theme: name is required');
        }
        if (!theme.url) {
          throw new Error('Theme: url is required');
        }
        if (typeof theme.url !== 'string') {
          throw new Error('Theme: url must be of "string" type');
        }
      }
    }

    const {
      specs,
      plugins,
      highPriorityPlugins,
      markdownItPlugins,
      renderReactNodeView,
    } = editor ?? {};

    if (specs && !Array.isArray(specs)) {
      throw new Error(`Extension "${name}": specs must be an array`);
    }
    if (plugins && !Array.isArray(plugins)) {
      throw new Error(`Extension "${name}": plugins must be an array`);
    }
    if (highPriorityPlugins && !Array.isArray(highPriorityPlugins)) {
      throw new Error(
        `Extension "${name}": highPriorityPlugins must be an array`,
      );
    }
    if (markdownItPlugins && !Array.isArray(markdownItPlugins)) {
      throw new Error(
        `Extension "${name}": markdownItPlugins must be an array`,
      );
    }
    if (
      renderReactNodeView &&
      Object.values(renderReactNodeView).some((r) => typeof r !== 'function')
    ) {
      throw new Error(
        `Extension "${name}": renderReactNodeView must be an Object<string, function> where the function returns a react element`,
      );
    }

    const {
      operations,
      sidebars,
      dialogs,
      noteSidebarWidgets,
      slices,
      nsmSlices,
      nsmEffects,
      operationHandler,
      storageProvider,
      noteFormatProvider,
      onStorageError,
    } = application ?? {};

    if (operationHandler && !operations) {
      throw new Error(
        `Extension "${name}": operationHandler is required when defining operations`,
      );
    }

    if (operations) {
      if (
        !operations.every(
          (a) =>
            hasCorrectScheme('operation', a.name) &&
            hasCorrectPackageName(name, a.name),
        )
      ) {
        throw new Error(
          `Extension "${name}": An operation must have a name with the following schema operation::<extension_pkg_name:xyz. For example 'operation::@bangle.io/example:hello-world'`,
        );
      }

      if (operations.length !== new Set(operations.map((r) => r.name)).size) {
        throw new Error(`Extension "${name}": Operation name must be unique`);
      }
    }

    if (sidebars) {
      if (!Array.isArray(sidebars)) {
        throw new Error(`Extension "${name}": sidebars must be an array`);
      }

      if (
        !sidebars.every((s) => {
          const validName =
            hasCorrectScheme('sidebar', s.name) &&
            hasCorrectPackageName(name, s.name);

          const validIcon = Boolean(s.activitybarIcon);
          const validComponent = Boolean(s.ReactComponent);
          const validHint = typeof s.hint === 'string';

          return (
            validName && validIcon && validIcon && validComponent && validHint
          );
        })
      ) {
        throw new Error(`Extension "${name}": Invalid sidebars config.`);
      }
    }

    if (slices) {
      if (
        !slices.every(
          (slice) =>
            slice instanceof Slice &&
            hasCorrectScheme('slice', slice.key) &&
            hasCorrectPackageName(name, slice.key),
        )
      ) {
        throw new Error(
          `Extension "${name}": invalid slice. Slice key must be prefixed with extension name followed by a semicolon (:). For example, "new SliceKey(\'slice::my-extension-name:xyz\')"`,
        );
      }
    }

    if (nsmSlices) {
      if (
        !nsmSlices.every(
          (slice) =>
            isSlice(slice) &&
            slice.name.startsWith(`slice::${pkgNameWithoutBangleIo(name)}:`),
        )
      ) {
        throw new Error(
          `Extension "${name}": invalid slice name. Must start with ${`slice::${pkgNameWithoutBangleIo(
            name,
          )}:`}`,
        );
      }
    }

    if (nsmEffects) {
      if (
        !nsmEffects.every(
          (effectCreator) => typeof effectCreator === 'function',
        )
      ) {
        throw new Error(`Extension "${name}": invalid slice effect.`);
      }
    }

    if (
      noteSidebarWidgets &&
      !noteSidebarWidgets.every((s) => {
        const validName =
          hasCorrectScheme('note-sidebar-widget', s.name) &&
          hasCorrectPackageName(name, s.name);

        return validName;
      })
    ) {
      throw new Error(
        `Extension "${name}": Invalid note sidebar widget name. Example: "note-sidebar-widget::my-extension-name:xyz"`,
      );
    }

    if (
      dialogs &&
      !dialogs.every((s) => {
        const validName =
          hasCorrectScheme('dialog', s.name) &&
          hasCorrectPackageName(name, s.name);

        return validName;
      })
    ) {
      throw new Error(
        `Extension "${name}" : Invalid dialog name. Example: "dialog::my-extension-name:xyz"`,
      );
    }

    if (noteFormatProvider) {
      if (typeof noteFormatProvider.name !== 'string') {
        throw new Error('Extension: noteFormatProvider must have a valid name');
      }
      if (typeof noteFormatProvider.description !== 'string') {
        throw new Error(
          'Extension: noteFormatProvider must have a description name',
        );
      }
      if (
        typeof noteFormatProvider.parseNote !== 'function' ||
        typeof noteFormatProvider.serializeNote !== 'function'
      ) {
        throw new Error(
          'Extension: noteFormatProvider must have parseNote and serializeNote functions',
        );
      }
    }

    if (storageProvider) {
      if (typeof storageProvider.name !== 'string') {
        throw new Error('Extension: Storage provider must have a valid name');
      }
      if (typeof storageProvider.description !== 'string') {
        throw new Error(
          'Extension: Storage provider must have a valid description',
        );
      }
      if (typeof onStorageError !== 'function') {
        throw new Error(
          'Extension: onStorageError must be defined when storage provider is defined',
        );
      }
    }

    return new Extension<OpType>({ name, editor, application, themes }, _check);
  }

  name: string;
  editor: Config<OpType>['editor'];
  application: Config<OpType>['application'];
  themes: Config<OpType>['themes'];

  constructor(ext: Config<OpType>, check: typeof _check) {
    if (check !== _check) {
      throw new Error('Instantiate class via `Extension.create({})`');
    }
    this.name = ext.name;
    this.editor = ext.editor;
    this.application = ext.application;
    this.themes = ext.themes;
  }
}

function hasCorrectScheme(scheme: string, slug: string) {
  return scheme === resolveSlug(slug).scheme;
}

function hasCorrectPackageName(pkgName: string, slug: string) {
  return pkgName === resolveSlug(slug).pkgName;
}

function pkgNameWithoutBangleIo(pkgName: string) {
  return pkgName.replace('@bangle.io/', '');
}

function resolveSlug(slug: string) {
  if (slug.includes('?')) {
    throw new Error('Cannot have ? in the slug');
  }

  const [scheme, restString] = slug.split('::');
  const [pkgName, localSlug] = restString?.split(':') || [];

  return {
    scheme,
    pkgName,
    path: localSlug,
  };
}
