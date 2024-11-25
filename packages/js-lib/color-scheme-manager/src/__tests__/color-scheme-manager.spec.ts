// @vitest-environment happy-dom

import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ThemeConfig, ThemeManager } from '../index';

describe('ThemeManager', () => {
  let config: ThemeConfig;
  let matchMediaMock: Mock;
  let localStorageMock: Storage;

  beforeEach(() => {
    config = {
      lightThemeClass: 'light-theme',
      darkThemeClass: 'dark-theme',
      storageKey: 'themePreference',
      defaultPreference: 'system',
    };

    vi.spyOn(document.documentElement, 'setAttribute');
    vi.spyOn(document.documentElement.classList, 'add');
    vi.spyOn(document.documentElement.classList, 'remove');

    const store: Record<string, string> = {};
    localStorageMock = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const key in store) {
          delete store[key];
        }
      }),
      key: vi.fn(),
      length: 0,
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });

    // Mock matchMedia
    matchMediaMock = vi.fn().mockImplementation((query) => {
      return {
        matches: query.includes('dark'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });
  });

  it('initializes with default preference when no stored preference', () => {
    const themeManager = new ThemeManager(config);
    expect(themeManager.currentPreference).toBe(config.defaultPreference);
  });

  it('initializes with stored preference', () => {
    localStorageMock.setItem(config.storageKey, 'dark');
    const themeManager = new ThemeManager(config);
    expect(themeManager.currentPreference).toBe('dark');
  });

  it('reflects theme based on current preference', () => {
    const themeManager = new ThemeManager(config);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      themeManager.currentTheme,
    );
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      config.lightThemeClass,
      config.darkThemeClass,
    );
    expect(document.documentElement.classList.add).toHaveBeenCalledWith(
      themeManager.currentTheme,
    );
  });

  it('stores preference when setPreference is called', () => {
    const themeManager = new ThemeManager(config);
    themeManager.setPreference('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      config.storageKey,
      'dark',
    );
    expect(themeManager.currentPreference).toBe('dark');
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem = vi.fn(() => {
      throw new Error('localStorage error');
    });
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const themeManager = new ThemeManager(config);
    expect(themeManager.currentPreference).toBe(config.defaultPreference);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('reacts to system preference changes when preference is system', () => {
    const themeManager = new ThemeManager(config);
    themeManager.setPreference('system');
    const changeEvent = new Event('change');
    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    // @ts-expect-error matches is read-only in DOM but we need to change it for testing
    mediaQueryList.matches = true;
    mediaQueryList.dispatchEvent(changeEvent);

    expect(themeManager.currentTheme).toBe(config.darkThemeClass);
  });

  it('does not react to system preference changes when preference is not system', () => {
    const themeManager = new ThemeManager(config);
    themeManager.setPreference('dark');
    const changeEvent = new Event('change');
    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    // @ts-expect-error matches is read-only in DOM but we need to change it for testing
    mediaQueryList.matches = false;
    mediaQueryList.dispatchEvent(changeEvent);

    expect(themeManager.currentTheme).toBe(config.darkThemeClass);
  });

  it('invokes registered callbacks on theme change', () => {
    const themeManager = new ThemeManager(config);
    const callback = vi.fn();
    themeManager.onThemeChange(callback);
    themeManager.setPreference('light');

    expect(callback).toHaveBeenCalledWith({
      theme: config.lightThemeClass,
      preference: 'light',
    });
  });

  it('removes invalid stored preferences', () => {
    localStorageMock.getItem = vi.fn(() => 'invalid');
    const themeManager = new ThemeManager(config);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(config.storageKey);
    expect(themeManager.currentPreference).toBe(config.defaultPreference);
  });

  it('getTheme returns correct theme based on preference', () => {
    const themeManager = new ThemeManager(config);

    themeManager.setPreference('light');
    expect(themeManager.getTheme()).toBe(config.lightThemeClass);

    themeManager.setPreference('dark');
    expect(themeManager.getTheme()).toBe(config.darkThemeClass);

    themeManager.setPreference('system');
    matchMediaMock.mockReturnValueOnce({ matches: true });
    expect(themeManager.getTheme()).toBe(config.darkThemeClass);

    matchMediaMock.mockReturnValueOnce({ matches: false });
    expect(themeManager.getTheme()).toBe(config.lightThemeClass);
  });

  it('correctly applies theme using inline script', () => {
    const script = ThemeManager.getInlineScript(config);
    // biome-ignore lint/security/noGlobalEval: <explanation>
    eval(script);

    const expectedThemeClass = config.darkThemeClass;

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      expectedThemeClass,
    );
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      config.darkThemeClass,
      config.lightThemeClass,
    );
    expect(document.documentElement.classList.add).toHaveBeenCalledWith(
      expectedThemeClass,
    );
  });

  it('applies system theme based on inline script when preference is system', () => {
    const script = ThemeManager.getInlineScript({
      ...config,
      defaultPreference: 'system',
    });
    // biome-ignore lint/security/noGlobalEval: <explanation>
    eval(script);

    const expectedThemeClass = config.darkThemeClass;
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      expectedThemeClass,
    );
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      config.darkThemeClass,
      config.lightThemeClass,
    );
    expect(document.documentElement.classList.add).toHaveBeenCalledWith(
      expectedThemeClass,
    );
  });

  it('applies stored preference using inline script when preference exists in storage', () => {
    localStorageMock.setItem(config.storageKey, 'light');
    const script = ThemeManager.getInlineScript(config);
    // biome-ignore lint/security/noGlobalEval: <explanation>
    eval(script);

    const expectedThemeClass = config.lightThemeClass;

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      'data-theme',
      expectedThemeClass,
    );
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
      config.darkThemeClass,
      config.lightThemeClass,
    );
    expect(document.documentElement.classList.add).toHaveBeenCalledWith(
      expectedThemeClass,
    );
  });
});
