import type { ZodTypeAny } from 'zod';

export const zodFindUnsafeTypes = (topZod: ZodTypeAny) => {
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
