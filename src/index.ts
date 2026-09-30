#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { loadConfig, ConfigOptions } from './config';
import { fetchSchemas, FetchManagementApiOptions } from './remote';
import { camelCase, pascalCase } from './utils';

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
  const formatTypeName = options?.pascalCase ? pascalCase : camelCase;
  const safeName = formatTypeName(name);
  const { customFields, apiFields } = schema;
  const customs = Object.fromEntries(
    customFields.map(({ fieldId, createdAt }) => [createdAt, fieldId])
  );
  const getKindType = (field: MicroCMSFieldType) => {
    const { kind, required } = field;
    const types: Record<string, () => string> = {
      text: () => 'string',
      textArea: () => 'string',
      richEditor: () => 'string',
      richEditorV2: () => 'string',
      number: () => 'number',
      select: () => {
        const { selectItems: list, multipleSelect } = field;
        if (!list || list.length === 0) return 'string[]';
        const str = list.reduce((a, rep, index) => `${a}${index ? ' | ' : ''}'${rep.value}'`, '');
        if (multipleSelect) return list.length > 1 ? `(${str})[]` : `${str}[]`;
        return `[${str}]`;
      },
      relation: () =>
        required
          ? `Reference<T, '${field.fieldId}' extends keyof R ? R['${field.fieldId}'] : unknown>`
          : `Reference<T, ('${field.fieldId}' extends keyof R ? R['${field.fieldId}'] : unknown) | null>`,
      relationList: () =>
        `Reference<T, '${field.fieldId}' extends keyof R ? R['${field.fieldId}'] : unknown>[]`,
      boolean: () => 'boolean',
      date: () => 'string',
      media: () => 'MediaType',
      mediaList: () => 'MediaType[]',
      file: () => '{ url: string; fileSize: number }',
      iframe: () => 'any',
      custom: () => `${safeName}_${customs[field.customFieldCreatedAt!]}`,
      repeater: () => {
        const list =
          field.customFieldIds ??
          field.customFieldCreatedAtList?.map((createdAt) => customs[createdAt]) ??
          [];
        const str = list.reduce((a, id, index) => `${a}${index ? ' | ' : ''}${safeName}_${id}`, '');
        return list.length > 1 ? `(${str})[]` : `${str}[]`;
      },
    };
    return types[kind]?.() || 'any';
  };
  const getDoc = (field: MicroCMSFieldType) => {
    const lines = [` * ${field.name}`];
    if (field.required) {
      lines.push(' * @required');
    }
    if (field.kind === 'select' && field.selectItems?.length) {
      lines.push(` * @values ${field.selectItems.map((item) => item.value).join(', ')}`);
    }
    return `/**\n${lines.join('\n')}\n */`;
  };
  const getFields = (fields: MicroCMSFieldType[]) => {
    return fields.map((field) => {
      const { fieldId, required } = field;
      return `${getDoc(field)}\n${fieldId}${!required ? '?' : ''}: ${getKindType(field)}`;
    });
  };
  const getCustomFields = (fieldId: string, fields: MicroCMSFieldType[]) => {
    return [`fieldId: '${fieldId}'`, ...getFields(fields)];
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
  const formatTypeName = options?.pascalCase ? pascalCase : camelCase;
  const safeName = formatTypeName(name);
  const structureType = type === 'object' ? 'StructureObject' : 'Structure';
  let buffer = `export type ${safeName}<T='get', R extends Record<string, unknown> = Record<string, unknown>> = ${structureType}<\nT,\n{\n`;

  mainSchema.forEach((field) => {
    field.split('\n').forEach((s) => (buffer += `  ${s}\n`));
  });
  buffer += '}>\n\n';

  Object.entries(customSchemas).forEach(([customName, fields]) => {
    buffer += `export interface ${safeName}_${customName} {\n`;
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
  const formatTypeName = options?.pascalCase ? pascalCase : camelCase;
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
      output += `    '${name}': ${formatTypeName(name)}<'${method}'>\n`;
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
    const schema = fs.readFileSync(filePath);
    entries.push({
      name,
      schema: JSON.parse(schema.toString()) as MicroCMSSchemaType,
    });
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
  options?: GenerateOptions & ConfigOptions
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

const parseCliArgs = () => {
  const args = process.argv.slice(2);
  let configPath: string | undefined;
  let serviceDomain: string | undefined;
  let apiKey: string | undefined;
  let output: string | undefined;
  let pascalCaseFlag = false;
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--pascal-case') {
      pascalCaseFlag = true;
    } else if (arg === '-c' || arg === '--config') {
      configPath = args[++i];
    } else if (arg === '-s' || arg === '--service-domain') {
      serviceDomain = args[++i];
    } else if (arg === '-k' || arg === '--api-key') {
      apiKey = args[++i];
    } else if (arg === '-o' || arg === '--output') {
      output = args[++i];
    } else if (!arg.startsWith('-')) {
      positionalArgs.push(arg);
    }
  }

  const config = loadConfig(configPath);

  const finalServiceDomain =
    serviceDomain ?? config.serviceDomain ?? process.env.MICROCMS_SERVICE_DOMAIN;
  const finalApiKey = apiKey ?? config.apiKey ?? process.env.MICROCMS_API_KEY;
  const finalPascalCase = pascalCaseFlag || (config.pascalCase ?? false);
  const finalInput = positionalArgs[0] ?? config.input;
  const finalOutput = positionalArgs[1] ?? output ?? config.output;

  return {
    input: finalInput,
    output: finalOutput,
    serviceDomain: finalServiceDomain,
    apiKey: finalApiKey,
    pascalCase: finalPascalCase,
  };
};

if (require.main === module) {
  const { input, output, serviceDomain, apiKey, pascalCase: pascalCaseFlag } = parseCliArgs();

  if (!input && (!serviceDomain || !apiKey)) {
    console.log(`Usage:
  # Local schema mode:
  microcms-typescript <src-dir-or-file> [dist-file] [--pascal-case]

  # Remote Management API mode:
  microcms-typescript --service-domain <domain> --api-key <key> [dist-file] [--pascal-case]

  # Config file mode:
  microcms-typescript --config <path-to-config.json>
`);
    process.exit(1);
  }

  main(input, output, {
    serviceDomain,
    apiKey,
    pascalCase: pascalCaseFlag,
  }).catch((err) => {
    console.error('Error generating types:', err);
    process.exit(1);
  });
}
