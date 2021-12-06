export const DarkTheme = 'dark';
export const LightTheme = 'light';

export type ThemeType = typeof DarkTheme | typeof LightTheme;

export const Themes: ThemeType[] = [DarkTheme, LightTheme];
