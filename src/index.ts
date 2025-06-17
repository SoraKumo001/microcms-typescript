#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { camelCase } from './utils';

interface MicroCMSFieldType {
  fieldId: string;
  name: string;
  kind:
    | 'text'
    | 'textArea'
    | 'number'
    | 'richEditor'
    | 'select'
    | 'custom'
    | 'repeater'
    | 'media'
    | 'mediaList'
    | 'file'
    | 'relation'
    | 'relationList'
    | 'date';
  required: boolean;
  selectItems?: { value: string }[];
  multipleSelect?: boolean;
  customFieldCreatedAt?: string;
  customFieldCreatedAtList?: string[];
}

interface MicroCMSSchemaType {
  apiFields: MicroCMSFieldType[];
  customFields: {
    createdAt: string;
    fieldId: string;
    fields: MicroCMSFieldType[];
  }[];
}

export const convertSchema = (name: string, schema: MicroCMSSchemaType) => {
  const { customFields, apiFields } = schema;
  const customs = Object.fromEntries(
    customFields.map(({ fieldId, createdAt }) => [createdAt, fieldId])
  );
  const getKindType = (fields: MicroCMSFieldType) => {
    const { kind, required } = fields;
    const types = {
      text: () => 'string',
      textArea: () => 'string',
      richEditor: () => 'string',
      number: () => 'number',
      select: () => {
        const { selectItems: list, multipleSelect } = fields;
        const str = list!.reduce((a, rep, index) => `${a}${index ? ' | ' : ''}'${rep.value}'`, '');
        if (multipleSelect) return list!.length > 1 ? `(${str})[]` : `${str}[]`;
        return `[${str}]`;
      },
      relation: () => (required ? 'Reference<T,unknown>' : 'Reference<T,unknown | null>'),
      relationList: () => 'Reference<T,unknown>[]',
      boolean: () => 'boolean',
      date: () => 'string',
      media: () => 'MediaType',
      mediaList: () => 'MediaType[]',
      file: () => '{ url: string }',
      custom: () => `${name}_${customs[fields.customFieldCreatedAt!]}`,
      repeater: () => {
        const { customFieldCreatedAtList: list } = fields;
        const str = list!.reduce(
          (a, rep, index) => `${a}${index ? ' | ' : ''}${name}_${customs[rep]}`,
          ''
        );
        return list!.length > 1 ? `(${str})[]` : `${str}[]`;
      },
    };
    return types[kind]?.() || 'any';
  };
  const getDoc = (field: MicroCMSFieldType) => {
    return `/**\n * ${field.name}\n */`;
  };
  const getFields = (fields: MicroCMSFieldType[]) => {
    return fields.map((fields) => {
      const { fieldId, required } = fields;
      return `${getDoc(fields)}\n${fieldId}${!required ? '?' : ''}: ${getKindType(fields)}`;
    });
  };
  const getCustomFields = (fieldId: string, fields: MicroCMSFieldType[]) => {
    return [`fieldId: '${fieldId}'`, ...getFields(fields)];
  };

  const mainSchema = getFields(apiFields);
  const customSchemas = Object.fromEntries(
    customFields.map(({ fieldId, fields }) => [fieldId, getCustomFields(fieldId, fields)])
  );
  return { mainSchema, customSchemas };
};

const outSchema = (
  name: string,
  { mainSchema, customSchemas }: ReturnType<typeof convertSchema>
) => {
  let buffer = `export type ${camelCase(name)}<T='get'> = Structure<\nT,\n{\n`;

  mainSchema.forEach((field) => {
    field.split('\n').forEach((s) => (buffer += `  ${s}\n`));
  });
  buffer += '}>\n\n';

  Object.entries(customSchemas).forEach(([customName, fields]) => {
    buffer += `interface ${name}_${customName} {\n`;
    fields.forEach((field) => {
      field.split('\n').forEach((s) => (buffer += `  ${s}\n`));
    });
    buffer += '}\n';
  });
  return buffer;
};

const main = (dir: string, dest?: string) => {
  const files = fs.readdirSync(dir);
  const typeNames = new Map<string, string>();
  Array.from(files)
    .reverse()
    .forEach((file) => {
      const name = file.match(/api-(.*)-.*\.json/)?.[1];
      if (!name || typeNames.has(name)) return false;
      typeNames.set(name, file);
      return true;
    });
  let output = `type Reference<T, R> = T extends 'get' ? R : string | null;
interface GetsType<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}
type DateType = {
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
};
type MediaType = {
  url: string;
  width: number;
  height: number;
}
type Structure<T, P> = T extends 'get'
  ? { id: string } & DateType & Required<P>
  : T extends 'gets'
  ? GetsType<{ id: string } & DateType & Required<P>>
  : Partial<DateType> & (T extends 'patch' ? Partial<P> : P);\n\n`;
  typeNames.forEach(async (file, name) => {
    const schema = fs.readFileSync(path.resolve(dir, file));
    const s = convertSchema(name, JSON.parse(schema.toString()) as MicroCMSSchemaType);
    output += outSchema(name, s);
  });
  output += `\nexport interface EndPoints {\n`;

  ['get', 'gets', 'post', 'put', 'patch'].forEach((method) => {
    output += `  ${method}: {\n`;
    typeNames.forEach((_, name) => {
      output += `    '${name}': ${camelCase(name)}<'${method}'>\n`;
    });
    output += '  }\n';
  });

  output += '}\n';

  if (dest) fs.writeFileSync(dest, output);
  else console.log(output);
};

if (process.argv.length < 3) {
  console.log('microcms-typescript src-dir [dist-file]');
} else {
  main(process.argv[2], process.argv[3]);
}
