#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

interface MicroCMSFieldType {
  fieldId: string;
  kind:
    | 'text'
    | 'number'
    | 'richEditor'
    | 'select'
    | 'custom'
    | 'repeater'
    | 'media'
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
      richEditor: () => 'string',
      number: () => 'number',
      select: () => {
        const { selectItems: list, multipleSelect } = fields;
        const str = list!.reduce((a, rep, index) => `${a}${index ? ' | ' : ''}'${rep.value}'`, '');
        if (multipleSelect) return list!.length > 1 ? `(${str})[]` : `${str}[]`;
        return `[${str}]`;
      },
      relation: () => (required ? 'string' : 'string | null'),
      relationList: () => 'string[]',
      boolean: () => 'boolean',
      date: () => 'string',
      media: () => '{url: string, width: number, height: number}',
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
  const getFiealds = (fiealds: MicroCMSFieldType[]) => {
    return fiealds.map((fields) => {
      const { fieldId, required, kind } = fields;
      return `${fieldId}${!required && kind === 'date' ? '?' : ''}: ${getKindType(fields)}`;
    });
  };

  const mainSchema = getFiealds(apiFields);
  const customSchemas = Object.fromEntries(
    customFields.map(({ fieldId, fields }) => [fieldId, getFiealds(fields)])
  );
  return { mainSchema, customSchemas };
};

const outSchema = (
  name: string,
  { mainSchema, customSchemas }: ReturnType<typeof convertSchema>
) => {
  let buffer = `export interface ${name} {\n`;
  mainSchema.forEach((fields) => {
    buffer += `  ${fields};\n`;
  });
  buffer += '}\n\n';

  Object.entries(customSchemas).forEach(([customName, fields]) => {
    buffer += `interface ${name}_${customName} {\n`;
    fields.forEach((fields) => {
      buffer += `  ${fields};\n`;
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
  let output = '';
  typeNames.forEach(async (file, name) => {
    const schema = fs.readFileSync(path.resolve(dir, file));
    const s = convertSchema(name, JSON.parse(schema.toString()) as MicroCMSSchemaType);
    output += outSchema(name, s);
  });
  if (dest) fs.writeFileSync(dest, output);
  else console.log(output);
};

if (process.argv.length < 3) {
  console.log('microcms-typescript src-dir [dist-file]');
} else {
  main(process.argv[2], process.argv[3]);
}
