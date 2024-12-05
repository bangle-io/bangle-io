/**
 * This file needs to be compiled with TSC because vite config needs to import it for script injection
 * Please run pnpm build-color-scheme-manager after any change
 */
type ThemePreference = 'light' | 'dark' | 'system';
export declare const THEME_MANAGER_DEFAULT_CONFIG: {
    readonly darkThemeClass: "BU_dark-scheme";
    readonly lightThemeClass: "BU_light-scheme";
    readonly defaultPreference: "system";
    readonly storageKey: "color-scheme";
};
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
export declare class ThemeManager {
    private readonly config;
    currentTheme: string;
    currentPreference: ThemePreference;
    private callbacks;
    constructor(config?: ThemeConfig);
    private getPrefersDarkScheme;
    private safeGetItem;
    private safeSetItem;
    private safeRemoveItem;
    private getStoredPreference;
    private storePreference;
    getTheme(): string;
    private reflectTheme;
    private setupSystemPreferenceListener;
    private setupStorageListener;
    setPreference(preference: ThemePreference): void;
    onThemeChange(callback: ThemeCallback): () => void;
    private triggerCallbacks;
    static getInlineScript(config?: ThemeConfig): string;
}
export {};
