export const THEME_MANAGER_DEFAULT_CONFIG = {
    darkThemeClass: 'BU_dark-scheme',
    lightThemeClass: 'BU_light-scheme',
    defaultPreference: 'system',
    storageKey: 'color-scheme',
};
export class ThemeManager {
    constructor(config = THEME_MANAGER_DEFAULT_CONFIG) {
        this.config = config;
        this.callbacks = [];
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            throw new Error('This code must be run in a browser environment');
        }
        this.currentPreference =
            this.getStoredPreference() || config.defaultPreference;
        this.currentTheme = this.getTheme();
        this.reflectTheme();
        this.setupSystemPreferenceListener();
    }
    safeGetItem(key) {
        try {
            return localStorage.getItem(key);
        }
        catch (error) {
            console.error(`Error getting item ${key} from localStorage:`, error);
            return null;
        }
    }
    safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
        }
        catch (error) {
            console.error(`Error setting item ${key} in localStorage:`, error);
        }
    }
    safeRemoveItem(key) {
        try {
            localStorage.removeItem(key);
        }
        catch (error) {
            console.error(`Error removing item ${key} from localStorage:`, error);
        }
    }
    getStoredPreference() {
        const stored = this.safeGetItem(this.config.storageKey);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }
        if (stored) {
            this.safeRemoveItem(this.config.storageKey);
        }
        return null;
    }
    storePreference(preference) {
        this.safeSetItem(this.config.storageKey, preference);
    }
    getTheme() {
        if (this.currentPreference === 'light')
            return this.config.lightThemeClass;
        if (this.currentPreference === 'dark')
            return this.config.darkThemeClass;
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? this.config.darkThemeClass
            : this.config.lightThemeClass;
    }
    reflectTheme() {
        const root = document.documentElement;
        root.setAttribute('data-theme', this.currentTheme);
        root.classList.remove(this.config.lightThemeClass, this.config.darkThemeClass);
        root.classList.add(this.currentTheme);
    }
    setupSystemPreferenceListener() {
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
    setPreference(preference) {
        this.currentPreference = preference;
        this.storePreference(preference);
        this.currentTheme = this.getTheme();
        this.reflectTheme();
        this.triggerCallbacks();
    }
    onThemeChange(callback) {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter((cb) => cb !== callback);
        };
    }
    triggerCallbacks() {
        for (const cb of this.callbacks) {
            cb({ theme: this.currentTheme, preference: this.currentPreference });
        }
    }
    static getInlineScript(config = THEME_MANAGER_DEFAULT_CONFIG) {
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
