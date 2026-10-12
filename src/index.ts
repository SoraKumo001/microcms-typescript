#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { loadConfig, ConfigOptions } from './config';
import { fetchSchemas, FetchManagementApiOptions } from './remote';
import { camelCase, pascalCase, toIdentifier, quote, propertyKey, escapeComment } from './utils';

export interface MicroCMSFieldType {
  fieldId: string;
  name: string;
  kind:
    | 'text'
    | 'textArea'
    | 'number'
    | 'richEditor'
    | 'richEditorV2'
    | 'select'
    | 'custom'
    | 'repeater'
    | 'media'
    | 'mediaList'
    | 'file'
    | 'relation'
    | 'relationList'
    | 'boolean'
    | 'iframe'
    | 'date';
  required: boolean;
  selectItems?: { value: string }[];
  multipleSelect?: boolean;
  customFieldCreatedAt?: string;
  customFieldCreatedAtList?: string[];
  customFieldIds?: string[];
}

export interface MicroCMSSchemaType {
  apiFields: MicroCMSFieldType[];
  customFields: {
    createdAt?: string;
    fieldId: string;
    fields: MicroCMSFieldType[];
  }[];
  type?: 'list' | 'object';
}

export interface SchemaEntry {
  name: string;
  schema: MicroCMSSchemaType;
}

export interface GenerateOptions {
  pascalCase?: boolean;
}

const toTypeName = (name: string, options?: GenerateOptions): string =>
  toIdentifier((options?.pascalCase ? pascalCase : camelCase)(name));

export const extractEndpointName = (filename: string): string => {
  const match = filename.match(/api-(.*)-.*\.json/);
  if (match) return match[1];
  return path.basename(filename, path.extname(filename));
};

export const convertSchema = (
  name: string,
  schema: MicroCMSSchemaType,
  options?: GenerateOptions
) => {
  const safeName = toTypeName(name, options);
  const { customFields, apiFields } = schema;
  const customs = Object.fromEntries(
    customFields.map(({ fieldId, createdAt }) => [createdAt, fieldId])
  );
  const customTypeName = (createdAt: string | undefined, fieldId: string): string => {
    const id = createdAt === undefined ? undefined : customs[createdAt];
    if (id === undefined) {
      console.warn(
        `Warning: ${name}.${fieldId}: custom field definition not found; falling back to 'unknown'.`
      );
      return 'unknown';
    }
    return `${safeName}_${toIdentifier(id)}`;
  };
  const getKindType = (field: MicroCMSFieldType) => {
    const { kind, required } = field;
    const key = quote(field.fieldId);
    const types: Record<string, () => string> = {
      text: () => 'string',
      textArea: () => 'string',
      richEditor: () => 'string',
      richEditorV2: () => 'string',
      number: () => 'number',
      select: () => {
        const { selectItems: list, multipleSelect } = field;
        if (!list || list.length === 0) return 'string[]';
        const str = list.map((item) => quote(item.value)).join(' | ');
        if (multipleSelect) return list.length > 1 ? `(${str})[]` : `${str}[]`;
        return `[${str}]`;
      },
      relation: () =>
        required
          ? `Reference<T, ${key} extends keyof R ? R[${key}] : unknown>`
          : `Reference<T, (${key} extends keyof R ? R[${key}] : unknown) | null>`,
      relationList: () => `Reference<T, ${key} extends keyof R ? R[${key}] : unknown>[]`,
      boolean: () => 'boolean',
      date: () => 'string',
      media: () => 'MediaType',
      mediaList: () => 'MediaType[]',
      file: () => '{ url: string; fileSize: number }',
      iframe: () => 'any',
      custom: () => customTypeName(field.customFieldCreatedAt, field.fieldId),
      repeater: () => {
        const list =
          field.customFieldIds?.map((id) => `${safeName}_${toIdentifier(id)}`) ??
          field.customFieldCreatedAtList?.map((createdAt) =>
            customTypeName(createdAt, field.fieldId)
          ) ??
          [];
        const str = list.join(' | ');
        return list.length > 1 ? `(${str})[]` : `${str}[]`;
      },
    };
    const convert = types[kind];
    if (!convert) {
      console.warn(`Warning: ${name}.${field.fieldId}: unsupported kind '${kind}'; using 'any'.`);
      return 'any';
    }
    return convert();
  };
  const getDoc = (field: MicroCMSFieldType) => {
    const lines = escapeComment(field.name)
      .split(/\r?\n/)
      .map((line) => ` * ${line}`);
    if (field.required) {
      lines.push(' * @required');
    }
    if (field.kind === 'select' && field.selectItems?.length) {
      const values = field.selectItems.map((item) => item.value).join(', ');
      lines.push(` * @values ${escapeComment(values).replace(/\r?\n/g, ' ')}`);
    }
    return `/**\n${lines.join('\n')}\n */`;
  };
  const getFields = (fields: MicroCMSFieldType[]) => {
    return fields.map((field) => {
      const { fieldId, required } = field;
      return `${getDoc(field)}\n${propertyKey(fieldId)}${!required ? '?' : ''}: ${getKindType(field)}`;
    });
  };
  const getCustomFields = (fieldId: string, fields: MicroCMSFieldType[]) => {
    return [`fieldId: ${quote(fieldId)}`, ...getFields(fields)];
  };

  const mainSchema = getFields(apiFields);
  const customSchemas = Object.fromEntries(
    customFields.map(({ fieldId, fields }) => [fieldId, getCustomFields(fieldId, fields)])
  );
  return { mainSchema, customSchemas, type: schema.type };
};

export const outSchema = (
  name: string,
  { mainSchema, customSchemas, type }: ReturnType<typeof convertSchema>,
  options?: GenerateOptions
) => {
  const safeName = toTypeName(name, options);
  const structureType = type === 'object' ? 'StructureObject' : 'Structure';
  let buffer = `export type ${safeName}<T='get', R extends Record<string, unknown> = Record<string, unknown>> = ${structureType}<\nT,\n{\n`;

  mainSchema.forEach((field) => {
    field.split('\n').forEach((s) => (buffer += `  ${s}\n`));
  });
  buffer += '}>\n\n';

  Object.entries(customSchemas).forEach(([customName, fields]) => {
    buffer += `export interface ${safeName}_${toIdentifier(customName)} {\n`;
    fields.forEach((field) => {
      field.split('\n').forEach((s) => (buffer += `  ${s}\n`));
    });
    buffer += '}\n';
  });
  return buffer;
};

export const HEADER_TYPES = `type Reference<T, R> = T extends 'get' ? R : string | null;
interface GetsType<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}
type DateType = {
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  revisedAt: string | null;
};
type MediaType = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}
type Structure<T, P> = T extends 'get'
  ? { id: string } & DateType & P
  : T extends 'gets'
  ? GetsType<{ id: string } & DateType & P>
  : Partial<DateType> & (T extends 'patch' ? Partial<P> : P);

type StructureObject<T, P> = T extends 'get'
  ? DateType & P
  : Partial<DateType> & (T extends 'patch' ? Partial<P> : P);\n\n`;

export const generateFromSchemas = (entries: SchemaEntry[], options?: GenerateOptions): string => {
  let output = HEADER_TYPES;

  entries.forEach(({ name, schema }) => {
    const s = convertSchema(name, schema, options);
    output += outSchema(name, s, options);
  });

  output += `\nexport interface EndPoints {\n`;

  ['get', 'gets', 'post', 'put', 'patch'].forEach((method) => {
    output += `  ${method}: {\n`;
    entries.forEach(({ name, schema }) => {
      if (method === 'gets' && schema.type === 'object') return;
      output += `    ${quote(name)}: ${toTypeName(name, options)}<'${method}'>\n`;
    });
    output += '  }\n';
  });

  output += '}\n';
  return output;
};

export const generateFromPath = (targetPath: string, options?: GenerateOptions): string => {
  const stat = fs.statSync(targetPath);
  const typeNames = new Map<string, string>();

  if (stat.isDirectory()) {
    const files = fs.readdirSync(targetPath).sort();
    Array.from(files)
      .reverse()
      .forEach((file) => {
        const name = extractEndpointName(file);
        if (!name || typeNames.has(name) || !file.endsWith('.json')) return;
        typeNames.set(name, path.resolve(targetPath, file));
      });
  } else {
    const filename = path.basename(targetPath);
    const name = extractEndpointName(filename);
    typeNames.set(name, targetPath);
  }

  const entries: SchemaEntry[] = [];
  typeNames.forEach((filePath, name) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      entries.push({ name, schema: JSON.parse(content) as MicroCMSSchemaType });
    } catch (e) {
      throw new Error(`Failed to parse schema file ${filePath}: ${(e as Error).message}`, {
        cause: e,
      });
    }
  });

  return generateFromSchemas(entries, options);
};

export const generateFromDir = (dir: string, options?: GenerateOptions): string => {
  return generateFromPath(dir, options);
};

export const generateFromRemote = async (
  remoteOptions: FetchManagementApiOptions,
  options?: GenerateOptions
): Promise<string> => {
  const apis = await fetchSchemas(remoteOptions);
  const entries: SchemaEntry[] = apis.map((api) => ({
    name: api.endpoint,
    schema: api,
  }));
  return generateFromSchemas(entries, options);
};

export const main = async (
  targetPath?: string,
  dest?: string,
  options?: GenerateOptions & ConfigOptions & { check?: boolean }
) => {
  let output: string;

  if (options?.serviceDomain && options?.apiKey) {
    output = await generateFromRemote(
      {
        serviceDomain: options.serviceDomain,
        apiKey: options.apiKey,
      },
      options
    );
  } else if (targetPath) {
    output = generateFromPath(targetPath, options);
  } else {
    throw new Error('Either input file/directory or serviceDomain & apiKey must be provided.');
  }

  if (options?.check) {
    if (!dest) throw new Error('--check requires an output file.');
    const normalize = (s: string) => s.replace(/\r\n/g, '\n');
    const current = fs.existsSync(dest) ? normalize(fs.readFileSync(dest, 'utf-8')) : undefined;
    if (current !== normalize(output)) {
      throw new Error(
        `${dest} is ${current === undefined ? 'missing' : 'out of date'}. Run without --check to regenerate it.`
      );
    }
    return;
  }

  if (dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.writeFileSync(dest, output);
  } else {
    console.log(output);
  }
};

export const USAGE = `Usage:
  # Local schema mode:
  microcms-typescript <src-dir-or-file> [dist-file] [--pascal-case]

  # Remote Management API mode:
  microcms-typescript --service-domain <domain> --api-key <key> [dist-file] [--pascal-case]

  # Config file mode:
  microcms-typescript --config <path-to-config.json>

Options:
  -o, --output <file>            Output TypeScript file
  -s, --service-domain <domain>  microCMS service domain (env: MICROCMS_SERVICE_DOMAIN)
  -k, --api-key <key>            Management API key (env: MICROCMS_API_KEY)
  -c, --config <path>            Config file (default: microcms-typescript.config.json)
      --pascal-case              Generate PascalCase type names
      --check                    Exit with an error if the output file is not up to date
  -h, --help                     Show this help
  -v, --version                  Show version
`;

export const parseCliArgs = (argv: string[]) => {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'pascal-case': { type: 'boolean' },
      check: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
      config: { type: 'string', short: 'c' },
      'service-domain': { type: 'string', short: 's' },
      'api-key': { type: 'string', short: 'k' },
      output: { type: 'string', short: 'o' },
    },
  });

  const config = loadConfig(values.config);

  return {
    help: values.help ?? false,
    version: values.version ?? false,
    check: values.check ?? false,
    input: positionals[0] ?? config.input,
    output: positionals[1] ?? values.output ?? config.output,
    serviceDomain:
      values['service-domain'] ?? config.serviceDomain ?? process.env.MICROCMS_SERVICE_DOMAIN,
    apiKey: values['api-key'] ?? config.apiKey ?? process.env.MICROCMS_API_KEY,
    pascalCase: values['pascal-case'] || (config.pascalCase ?? false),
  };
};

const run = async () => {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (args.version) {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    console.log(pkg.version);
    return;
  }
  if (!args.input && (!args.serviceDomain || !args.apiKey)) {
    console.error(USAGE);
    process.exit(1);
  }

  await main(args.input, args.output, args);
};

if (require.main === module) {
  run().catch((err) => {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
