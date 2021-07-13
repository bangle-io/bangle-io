import React from 'react';
import { EditorPluginDefinition } from './PluginType';

const _check = Symbol();

export interface EditorConfig {
  name: string;
  specs?: any;
  plugins?: EditorPluginDefinition[];
  highPriorityPlugins?: EditorPluginDefinition[];
  markdownItPlugins?: any[];
  ReactComponent?: React.ComponentType<{
    key: string;
    wsPath: string;
    editorId: number;
  }>;
  renderReactNodeView?: (...args: any[]) => any;
  initialScrollPos?: (arg: any) => any;
  initialSelection?: (...args: any[]) => any;
  // deprecate this
  beforeDestroy?: (arg: any) => any;
}
export interface ActionDefinitionType {
  name: string;
  title: string;
  keybinding?: string;
  // when true, will hide it from the user
  hidden?: boolean;
}

export interface ActionType {
  name: string;
  value?: any;
}

export type ActionHandler = (action: ActionType) => boolean;
export type RegisterActionHandlerType = (cb: ActionHandler) => () => void;
export interface ApplicationConfig {
  name: string;
  ReactComponent?: React.ComponentType<{
    key: string;
    registerActionHandler: RegisterActionHandlerType;
  }>;
  palettes?: Array<{
    type: string;
    icon: JSX.Element;
    identifierPrefix: string;
    placeholder: string;
    parseRawQuery: (query: string) => string | undefined | null;
    ReactComponent: React.ComponentType<{
      query: string;
      paletteType: string | undefined;
      paletteMetadata: any;
      updatePalette: (
        type: string,
        initialQuery?: string,
        metadata?: any,
      ) => void;
      dismissPalette: (focusEditor?: boolean) => void;
      onSelect: (e: Event) => void;
      counter: number;
      getActivePaletteItem: () => any;
      updateCounter: (c: number) => void;
    }>;
  }>;
  actions?: Array<ActionDefinitionType>;
  optionsBar?: Array<{
    icon: JSX.Element;
    hint: string;
    action: string;
  }>;
  sidebars?: Array<{
    name: string;
    icon: JSX.Element;
    iconPlacement?: 'bottom' | 'top';
    ReactComponent: React.ComponentType<{}>;
    hint: string;
  }>;
}

interface Config {
  name: string;
  editor: EditorConfig;
  application: ApplicationConfig;
}

export class Extension {
  name: string;
  editor: EditorConfig;
  application: ApplicationConfig;

  constructor(ext: Config, check: typeof _check) {
    if (check !== _check) {
      throw new Error('Instantiate class via `Extension.create({})`');
    }
    this.name = ext.name;
    this.editor = ext.editor;
    this.application = ext.application;
  }
  static create(config: {
    name: string;
    editor?: Omit<EditorConfig, 'name'>;
    application?: Omit<ApplicationConfig, 'name'>;
  }) {
    const { name } = config;
    if (!name) {
      throw new Error('Extension: name is required');
    }

    const editor = Object.assign({}, config.editor, { name });
    const application = Object.assign({}, config.application, { name });

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

    const { palettes, actions, optionsBar, sidebars } = application;

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

      if (actions.some((a) => !a.name.startsWith('@action/' + name + '/'))) {
        throw new Error(
          `An action must have a name with the following schema @action/<extension_name/xyz. For example '@action/my-extension/hello-world'`,
        );
      }
      if (actions.length !== new Set(actions.map((r) => r.name)).size) {
        throw new Error('Action name must be unique');
      }
    }

    if (optionsBar) {
      if (!Array.isArray(actions)) {
        throw new Error('optionsBar must be an array');
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
            s.name.startsWith('@sidebar/' + name + '/');
          const validIcon = Boolean(s.icon);
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

    return new Extension({ name, editor, application }, _check);
  }
}
