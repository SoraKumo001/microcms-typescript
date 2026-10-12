import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import ts from 'typescript';
import { generateFromDir, generateFromSchemas, MicroCMSSchemaType } from '../src/index';
import { quote, propertyKey, toIdentifier, escapeComment } from '../src/utils';

const typeCheck = (code: string): string[] => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'microcms-ts-'));
  try {
    const file = path.join(dir, 'out.ts');
    fs.writeFileSync(file, code);
    const program = ts.createProgram([file], {
      strict: true,
      noEmit: true,
      types: [],
      target: ts.ScriptTarget.ES2022,
      skipLibCheck: true,
    });
    return ts
      .getPreEmitDiagnostics(program)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

describe('escaping helpers', () => {
  it('quotes strings safely', () => {
    expect(quote("it's")).toBe("'it\\'s'");
    expect(quote('a\\b\nc')).toBe("'a\\\\b\\nc'");
  });
  it('quotes only invalid property keys', () => {
    expect(propertyKey('title')).toBe('title');
    expect(propertyKey('my-field')).toBe("'my-field'");
  });
  it('makes identifiers valid', () => {
    expect(toIdentifier('2024-news')).toBe('_2024_news');
  });
  it('escapes comment terminators', () => {
    expect(escapeComment('a */ b')).toBe('a *\\/ b');
  });
});

describe('generated code compiles', () => {
  it('compiles output generated from fixtures', () => {
    const code = generateFromDir(path.resolve(__dirname, './fixtures'));
    expect(typeCheck(code)).toEqual([]);
  });

  it('compiles output for hostile names and values', () => {
    const schema: MicroCMSSchemaType = {
      apiFields: [
        { fieldId: 'my-field', name: 'closes */ comment\nnext line', kind: 'text', required: true },
        {
          fieldId: 'sel',
          name: 'select',
          kind: 'select',
          required: true,
          selectItems: [{ value: "it's" }, { value: 'a\\b' }, { value: 'x\ny' }],
          multipleSelect: true,
        },
        { fieldId: "rel'x", name: 'rel', kind: 'relation', required: true },
        { fieldId: 'broken', name: 'broken', kind: 'custom', required: false },
        { fieldId: 'rep', name: 'rep', kind: 'repeater', required: false, customFieldIds: ['a-b'] },
      ],
      customFields: [
        {
          fieldId: 'a-b',
          createdAt: 'c1',
          fields: [{ fieldId: 'in-ner', name: 'inner', kind: 'text', required: true }],
        },
      ],
    };
    const code = generateFromSchemas(
      [
        { name: '2024-news--list-', schema },
        { name: "o'brien", schema },
      ],
      { pascalCase: true }
    );
    expect(typeCheck(code)).toEqual([]);
    expect(code).toContain("'my-field': string");
    expect(code).toContain('broken?: unknown');
  });
});
