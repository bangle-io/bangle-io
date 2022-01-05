import React from 'react';

import type { RawSpecs } from '@bangle.dev/core';
import type { RenderNodeViewsFunction as BangleRenderNodeViewsFunction } from '@bangle.dev/react';

import { BaseAction, Slice } from '@bangle.io/create-store';
import type {
  ActionDefinitionType,
  ActionHandler,
  EditorWatchPluginState,
  NoteSidebarWidget,
} from '@bangle.io/shared-types';

import { EditorPluginDefinition } from './PluginType';

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

export type RegisterActionHandlerType = (cb: ActionHandler) => () => void;
export interface ApplicationConfig {
  name: string;
  ReactComponent?: React.ComponentType<{
    key: string;
    registerActionHandler: RegisterActionHandlerType;
  }>;
  actions?: Array<ActionDefinitionType>;
  sidebars?: Array<SidebarType>;
  noteSidebarWidgets?: Array<NoteSidebarWidget>;
  slices?: Array<Slice<any, BaseAction>>;
}

export interface SidebarType {
  activitybarIcon: JSX.Element;
  hint: string;
  name: `sidebar::${string}`;
  ReactComponent: React.ComponentType<{}>;
  title: string;
}

interface Config<T> {
  application: ApplicationConfig;
  editor: EditorConfig;
  initialState?: any;
  name: string;
}

export class Extension<T = unknown> {
  name: string;
  editor: EditorConfig;
  initialState?: any;
  application: ApplicationConfig;

  constructor(ext: Config<T>, check: typeof _check) {
    if (check !== _check) {
      throw new Error('Instantiate class via `Extension.create({})`');
    }
    this.name = ext.name;
    this.editor = ext.editor;
    this.initialState = ext.initialState;
    this.application = ext.application;
  }
  static create<ExtensionState = undefined>(config: {
    name: string;
    initialState?: ExtensionState;
    editor?: Omit<EditorConfig, 'name'>;
    application?: Omit<ApplicationConfig, 'name'>;
  }) {
    const { name } = config;

    if (!name) {
      throw new Error('Extension: name is required');
    }
    if (!/^[a-z0-9-_]+$/.test(name)) {
      throw new Error(
        'Extension name only allows the following characters "a..z" "0..9" "-" and "_"',
      );
    }

    const editor = Object.assign({}, config.editor, { name });
    const application = Object.assign({}, config.application, { name });
    const initialState = config.initialState;

    const {
      specs,
      plugins,
      highPriorityPlugins,
      markdownItPlugins,
      renderReactNodeView,
    } = editor;

    if (specs && !Array.isArray(specs)) {
      throw new Error('Extension: specs must be an array');
    }
    if (plugins && !Array.isArray(plugins)) {
      throw new Error('Extension: plugins must be an array');
    }
    if (highPriorityPlugins && !Array.isArray(highPriorityPlugins)) {
      throw new Error('Extension: highPriorityPlugins must be an array');
    }
    if (markdownItPlugins && !Array.isArray(markdownItPlugins)) {
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

    const { actions, sidebars, noteSidebarWidgets, slices } = application;

    if (actions) {
      if (
        !Array.isArray(actions) ||
        actions.some((a) => typeof a.name !== 'string')
      ) {
        throw new Error(
          'Actions must be an array of object, where each item has a name field',
        );
      }

      if (
        // TODO for now we are housing all core actions in this extension
        name !== 'bangle-io-core-actions' &&
        actions.some((a) => !a.name.startsWith('action::' + name + ':'))
      ) {
        console.log(
          actions.find((a) => !a.name.startsWith('action::' + name + ':')),
        );
        throw new Error(
          `An action must have a name with the following schema action::<extension_pkg_name:xyz. For example 'action::bangle-io-my-extension:hello-world'`,
        );
      }
      if (actions.length !== new Set(actions.map((r) => r.name)).size) {
        throw new Error('Action name must be unique');
      }
    }

    if (sidebars) {
      if (!Array.isArray(sidebars)) {
        throw new Error('Extension: sidebars must be an array');
      }

      if (
        !sidebars.every((s) => {
          const validName =
            typeof s.name === 'string' &&
            s.name.startsWith('sidebar::' + name + ':');
          const validIcon = Boolean(s.activitybarIcon);
          const validComponent = Boolean(s.ReactComponent);
          const validHint = typeof s.hint === 'string';
          return (
            validName && validIcon && validIcon && validComponent && validHint
          );
        })
      ) {
        throw new Error('Extension: Invalid sidebars config.');
      }
    }

    if (slices) {
      if (!Array.isArray(slices)) {
        throw new Error('Extension: slices must be an array');
      }
      if (!slices.every((slice) => slice instanceof Slice)) {
        throw new Error('Extension: invalid slice');
      }

      if (!slices.every((slice) => slice.key.startsWith(name + ':'))) {
        throw new Error(
          `Extension: invalid slice. Slice key must be prefixed with extension name followed by a semicolon (:). For example, "new SliceKey(\'my-extension-name:slice\')"`,
        );
      }
    }

    if (
      noteSidebarWidgets &&
      !noteSidebarWidgets.every((s) => {
        const validName =
          typeof s.name === 'string' &&
          s.name.startsWith('note-sidebar-widget::' + name + ':');
        return validName;
      })
    ) {
    }

    return new Extension<ExtensionState>(
      { name, editor, application, initialState },
      _check,
    );
  }
}
