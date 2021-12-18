import type { JsonObject, JsonPrimitive, JsonValue } from 'type-fest';

export type { JsonObject, JsonPrimitive, JsonValue };

export type UnPromisify<T> = T extends Promise<infer U> ? U : T;
