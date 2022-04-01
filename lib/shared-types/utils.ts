export type FirstParameter<T extends (...args: any) => any> = Parameters<T>[0];
