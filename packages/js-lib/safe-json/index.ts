import { parse, stringify } from 'superjson';

export function safeJSONParse(
  str: string,
): { success: true; value: any } | { success: false } {
  try {
    return { success: true, value: parse(str) };
  } catch (error) {
    return { success: false };
  }
}

export function safeJSONStringify(
  value: any,
): { success: true; value: string } | { success: false; value: undefined } {
  try {
    return { success: true, value: stringify(value) };
  } catch (error) {
    return { success: false, value: undefined };
  }
}
