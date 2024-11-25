/**
 * This file needs to be compiled with TSC because vite config needs to import it for script injection
 */
type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_MANAGER_DEFAULT_CONFIG = {
  darkThemeClass: 'BU_dark-scheme',
  lightThemeClass: 'BU_light-scheme',
  defaultPreference: 'system',
  storageKey: 'color-scheme',
} as const;

export interface ThemeConfig {
  readonly lightThemeClass: string;
  readonly darkThemeClass: string;
  readonly storageKey: string;
  readonly defaultPreference: ThemePreference;
}

export type ThemeCallback = (config: {
  theme: string;
  preference: ThemePreference;
}) => void;

export class ThemeManager {
  public currentTheme: string;
  public currentPreference: ThemePreference;
  private callbacks: Array<ThemeCallback> = [];

  constructor(
    private readonly config: ThemeConfig = THEME_MANAGER_DEFAULT_CONFIG,
  ) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('This code must be run in a browser environment');
    }

    this.currentPreference =
      this.getStoredPreference() || config.defaultPreference;
    this.currentTheme = this.getTheme();

    this.reflectTheme();
    this.setupSystemPreferenceListener();
  }

  private safeGetItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return null;
    }
  }

  private safeSetItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage:`, error);
    }
  }

  private safeRemoveItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage:`, error);
    }
  }

  private getStoredPreference(): ThemePreference | null {
    const stored = this.safeGetItem(this.config.storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored as ThemePreference;
    }
    if (stored) {
      this.safeRemoveItem(this.config.storageKey);
    }
    return null;
  }

  private storePreference(preference: ThemePreference) {
    this.safeSetItem(this.config.storageKey, preference);
  }

  getTheme(): string {
    if (this.currentPreference === 'light') return this.config.lightThemeClass;
    if (this.currentPreference === 'dark') return this.config.darkThemeClass;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? this.config.darkThemeClass
      : this.config.lightThemeClass;
  }

  private reflectTheme() {
    const root = document.documentElement;
    root.setAttribute('data-theme', this.currentTheme);
    root.classList.remove(
      this.config.lightThemeClass,
      this.config.darkThemeClass,
    );
    root.classList.add(this.currentTheme);
  }

  private setupSystemPreferenceListener() {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.currentPreference === 'system') {
          this.currentTheme = this.getTheme();
          this.reflectTheme();
          this.triggerCallbacks();
        }
      });
  }

  public setPreference(preference: ThemePreference) {
    this.currentPreference = preference;
    this.storePreference(preference);
    this.currentTheme = this.getTheme();
    this.reflectTheme();
    this.triggerCallbacks();
  }

  public onThemeChange(callback: ThemeCallback) {
    this.callbacks.push(callback);

    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  private triggerCallbacks() {
    for (const cb of this.callbacks) {
      cb({ theme: this.currentTheme, preference: this.currentPreference });
    }
  }

  static getInlineScript(
    config: ThemeConfig = THEME_MANAGER_DEFAULT_CONFIG,
  ): string {
    return `(function() {
var preference;
try {
    preference = localStorage.getItem('${config.storageKey}') || '${config.defaultPreference}';
} catch (error) {
    console.error('Error accessing localStorage:', error);
    preference = '${config.defaultPreference}';
}
var themeClass = preference === 'dark' ? '${config.darkThemeClass}' :
preference === 'light' ? '${config.lightThemeClass}' :
window.matchMedia('(prefers-color-scheme: dark)').matches ? '${config.darkThemeClass}' : '${config.lightThemeClass}';
document.documentElement.setAttribute('data-theme', themeClass);
document.documentElement.classList.remove('${config.darkThemeClass}', '${config.lightThemeClass}');
document.documentElement.classList.add(themeClass);
})();
      `.trim();
  }
}
