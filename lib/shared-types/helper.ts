import type { JsonValue } from 'type-fest';

export type { JsonValue };

export type UnPromisify<T> = T extends Promise<infer U> ? U : T;
