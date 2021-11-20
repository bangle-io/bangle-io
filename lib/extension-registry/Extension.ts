import React from 'react';

import type { RawSpecs } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';
import type { RenderNodeViewsFunction as BangleRenderNodeViewsFunction } from '@bangle.dev/react';

import type {
  ActionDefinitionType,
  ActionHandler,
} from '@bangle.io/shared-types';

import { EditorPluginDefinition } from './PluginType';
import { ExtensionPaletteType } from './UniversalPaletteType';

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
  initialScrollPos?: ({
    wsPath,
    editorId,
  }: {
    wsPath: string;
    editorId: number;
  }) => any;
  initialSelection?: ({
    wsPath,
    editorId,
    doc,
  }: {
    wsPath: string;
    editorId: number;
    doc: Node;
  }) => any;
}

export type RegisterActionHandlerType = (cb: ActionHandler) => () => void;
export interface ApplicationConfig {
  name: string;
  ReactComponent?: React.ComponentType<{
    key: string;
    registerActionHandler: RegisterActionHandlerType;
  }>;
  palettes?: Array<ExtensionPaletteType>;
  actions?: Array<ActionDefinitionType>;
  sidebars?: Array<SidebarType>;
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

    const { palettes, actions, sidebars } = application;

    if (palettes) {
      if (!Array.isArray(palettes)) {
        throw new Error('Extension: palettes must be an array');
      }
      if (!palettes.every((r) => r.type.startsWith(name + '/'))) {
        throw new Error(
          "Extension: palette's type must start with extension's name followed by '/'. Example 'my-extension-name/my-palette-type' ",
        );
      }
    }

    if (actions) {
      if (
        !Array.isArray(actions) ||
        actions.some((a) => typeof a.name !== 'string')
      ) {
        throw new Error(
          'Actions must be an array of object, where each item has a name field',
        );
      }

      if (actions.some((a) => !a.name.startsWith('action::' + name + ':'))) {
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

    return new Extension<ExtensionState>(
      { name, editor, application, initialState },
      _check,
    );
  }
}
