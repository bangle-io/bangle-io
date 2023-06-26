import type { ZodTypeAny } from 'zod';

/**
 * Checks if the zod schema contains any types that are not supported by superjson
 * @param schema - the zod schema to check
 */
export function assertSafeZodSchema<T extends ZodTypeAny>(schema: T): T {
  let unsafeTypes = zodFindUnsafeTypes(schema);

  if (unsafeTypes.length > 0) {
    throw new Error(
      `assertSafeZodSchema: schema contains unsafe types: ${unsafeTypes.join(
        ', ',
      )}`,
    );
  }

  return schema;
}

// dealing with types that are valid with superjson
export const zodFindUnsafeTypes = (topZod: ZodTypeAny): string[] => {
  let found: string[] = [];

  const recurse = (zod: ZodTypeAny) => {
    const { typeName } = zod._def;

    switch (typeName) {
      case 'ZodString':
        break;
      case 'ZodNumber':
        break;
      case 'ZodBoolean':
        break;
      case 'ZodUndefined':
        break;
      case 'ZodNull':
        break;

      case 'ZodLiteral': {
        break;
      }
      case 'ZodObject': {
        const properties = Object.values(zod._def.shape());

        properties.forEach((value) => {
          recurse(value as ZodTypeAny);
        });

        break;
      }

      case 'ZodArray': {
        recurse(zod._def.type);

        break;
      }

      case 'ZodUnion': {
        // z.union([z.string(), z.number()]) -> string | number
        const options: ZodTypeAny[] = zod._def.options;
        options.map((option) => recurse(option));
        break;
      }

      case 'ZodOptional': {
        recurse(zod._def.innerType);

        break;
      }

      case 'ZodNullable': {
        recurse(zod._def.innerType);
        break;
      }

      case 'ZodTuple': {
        // z.tuple([z.string(), z.number()]) -> [string, number]
        zod._def.items.forEach((option: ZodTypeAny) => recurse(option));
        break;
      }

      case 'ZodRecord': {
        recurse(zod._def.keyType);
        recurse(zod._def.valueType);
        break;
      }

      case 'ZodMap': {
        // z.map(z.string()) -> Map<string>
        recurse(zod._def.valueType);
        recurse(zod._def.keyType);
        break;
      }

      case 'ZodSet': {
        recurse(zod._def.valueType);
        break;
      }

      // case 'ZodEffects': {
      //   recurse(zod._def.schema);
      //   break;
      // }

      case 'ZodNativeEnum': {
        for (const [key, val] of Object.entries(zod._def.values)) {
          if (typeof val !== 'number' && typeof val !== 'string') {
            found.push(
              `ZodNativeEnum: for ${key} only supports string, number and boolean`,
            );
          }
        }
        break;
      }

      case 'ZodIntersection': {
        recurse(zod._def.left);
        recurse(zod._def.right);

        break;
      }

      default: {
        found.push(typeName);
        break;
      }
    }
  };

  recurse(topZod);

  return found;
};
