import { describe, it, expect } from 'vitest';
import path from 'path';
import { camelCase, pascalCase } from '../src/utils';
import {
  convertSchema,
  outSchema,
  generateFromDir,
  generateFromPath,
  MicroCMSSchemaType,
} from '../src/index';

describe('camelCase and pascalCase', () => {
  it('converts kebab-case and snake_case to camelCase', () => {
    expect(camelCase('news-categories')).toBe('newsCategories');
    expect(camelCase('test_data_api')).toBe('testDataApi');
    expect(camelCase('hello-world-test')).toBe('helloWorldTest');
    expect(camelCase('alreadyCamel')).toBe('alreadyCamel');
  });

  it('converts kebab-case and snake_case to PascalCase', () => {
    expect(pascalCase('news-categories')).toBe('NewsCategories');
    expect(pascalCase('test_data_api')).toBe('TestDataApi');
    expect(pascalCase('hello-world-test')).toBe('HelloWorldTest');
    expect(pascalCase('alreadyCamel')).toBe('AlreadyCamel');
  });
});

describe('convertSchema', () => {
  it('handles boolean fields correctly', () => {
    const schema: MicroCMSSchemaType = {
      apiFields: [
        {
          fieldId: 'isVisible',
          name: '表示フラグ',
          kind: 'boolean',
          required: true,
        },
        {
          fieldId: 'isDraft',
          name: '下書きフラグ',
          kind: 'boolean',
          required: false,
        },
      ],
      customFields: [],
    };

    const { mainSchema } = convertSchema('contents', schema);
    expect(mainSchema[0]).toContain('isVisible: boolean');
    expect(mainSchema[0]).toContain('* @required');
    expect(mainSchema[1]).toContain('isDraft?: boolean');
    expect(mainSchema[1]).not.toContain('* @required');
  });

  it('handles select fields (single and multiple) and includes values in JSDoc', () => {
    const schema: MicroCMSSchemaType = {
      apiFields: [
        {
          fieldId: 'singleSelect',
          name: '単数選択',
          kind: 'select',
          required: true,
          selectItems: [{ value: 'apple' }, { value: 'banana' }],
          multipleSelect: false,
        },
        {
          fieldId: 'multiSelect',
          name: '複数選択',
          kind: 'select',
          required: false,
          selectItems: [{ value: 'dog' }, { value: 'cat' }],
          multipleSelect: true,
        },
      ],
      customFields: [],
    };

    const { mainSchema } = convertSchema('articles', schema);
    expect(mainSchema[0]).toContain("singleSelect: ['apple' | 'banana']");
    expect(mainSchema[0]).toContain('* @values apple, banana');
    expect(mainSchema[1]).toContain("multiSelect?: ('dog' | 'cat')[]");
    expect(mainSchema[1]).toContain('* @values dog, cat');
  });

  it('handles iframe (extension) fields', () => {
    const schema: MicroCMSSchemaType = {
      apiFields: [
        {
          fieldId: 'customWidget',
          name: '拡張ウィジェット',
          kind: 'iframe',
          required: false,
        },
      ],
      customFields: [],
    };

    const { mainSchema } = convertSchema('page', schema);
    expect(mainSchema[0]).toContain('customWidget?: any');
  });

  it('handles relation and relationList', () => {
    const schema: MicroCMSSchemaType = {
      apiFields: [
        {
          fieldId: 'category',
          name: 'カテゴリ',
          kind: 'relation',
          required: true,
        },
        {
          fieldId: 'author',
          name: '著者',
          kind: 'relation',
          required: false,
        },
        {
          fieldId: 'tags',
          name: 'タグ',
          kind: 'relationList',
          required: false,
        },
      ],
      customFields: [],
    };

    const { mainSchema } = convertSchema('news', schema);
    expect(mainSchema[0]).toContain(
      "category: Reference<T, 'category' extends keyof R ? R['category'] : unknown>"
    );
    expect(mainSchema[1]).toContain(
      "author?: Reference<T, ('author' extends keyof R ? R['author'] : unknown) | null>"
    );
    expect(mainSchema[2]).toContain(
      "tags?: Reference<T, 'tags' extends keyof R ? R['tags'] : unknown>[]"
    );
  });

  it('formats custom fields with safe identifiers even if name contains hyphens', () => {
    const schema: MicroCMSSchemaType = {
      apiFields: [
        {
          fieldId: 'hero',
          name: 'ヒーロー',
          kind: 'custom',
          required: true,
          customFieldCreatedAt: '2023-01-01',
        },
        {
          fieldId: 'blocks',
          name: 'ブロック',
          kind: 'repeater',
          required: false,
          customFieldCreatedAtList: ['2023-01-01'],
        },
      ],
      customFields: [
        {
          fieldId: 'heroBlock',
          createdAt: '2023-01-01',
          fields: [
            {
              fieldId: 'text',
              name: 'テキスト',
              kind: 'text',
              required: true,
            },
          ],
        },
      ],
    };

    const { mainSchema, customSchemas } = convertSchema('news-categories', schema);
    expect(mainSchema[0]).toContain('hero: newsCategories_heroBlock');
    expect(mainSchema[1]).toContain('blocks?: newsCategories_heroBlock[]');
    expect(customSchemas['heroBlock']).toBeDefined();

    const output = outSchema('news-categories', { mainSchema, customSchemas });
    expect(output).toContain("export type newsCategories<T='get'");
    expect(output).toContain('export interface newsCategories_heroBlock');
    expect(output).not.toContain('news-categories_');
  });

  it('supports pascalCase option for type generation', () => {
    const schema: MicroCMSSchemaType = {
      apiFields: [
        {
          fieldId: 'title',
          name: 'タイトル',
          kind: 'text',
          required: true,
        },
      ],
      customFields: [],
    };

    const { mainSchema, customSchemas } = convertSchema('news-categories', schema, {
      pascalCase: true,
    });
    const output = outSchema('news-categories', { mainSchema, customSchemas }, {
      pascalCase: true,
    });

    expect(output).toContain("export type NewsCategories<T='get'");
  });
});

describe('generateFromDir and generateFromPath', () => {
  it('generates valid TypeScript output from the actual schema directory', () => {
    const schemaDir = path.resolve(__dirname, '../schema');
    const result = generateFromDir(schemaDir);

    expect(result).toContain('type Reference<T, R>');
    expect(result).toContain('publishedAt: string | null;');
    expect(result).toContain('revisedAt: string | null;');
    expect(result).toContain('export interface EndPoints');
    expect(result).toContain("'test3': test3<'get'>");
    expect(result).toContain("'news-categories': newsCategories<'get'>");
    expect(result).toContain('export interface news_richEditor');
  });

  it('supports pascalCase option when generating from directory', () => {
    const schemaDir = path.resolve(__dirname, '../schema');
    const result = generateFromDir(schemaDir, { pascalCase: true });

    expect(result).toContain("export type Test3<T='get'");
    expect(result).toContain("export type NewsCategories<T='get'");
    expect(result).toContain("'news-categories': NewsCategories<'get'>");
  });

  it('supports generating from a single schema file', () => {
    const singleFile = path.resolve(__dirname, '../schema/api-news-20220804195333.json');
    const result = generateFromPath(singleFile);

    expect(result).toContain("export type news<T='get', R extends Record<string, unknown> = Record<string, unknown>>");
    expect(result).toContain('export interface news_richEditor');
    expect(result).toContain("'news': news<'get'>");
    expect(result).not.toContain('test3');
  });

  it('supports object API type generation (single content)', () => {
    const schema: MicroCMSSchemaType = {
      apiFields: [
        {
          fieldId: 'companyName',
          name: '会社名',
          kind: 'text',
          required: true,
        },
      ],
      customFields: [],
      type: 'object',
    };

    const s = convertSchema('company', schema);
    const output = outSchema('company', s);

    expect(output).toContain("export type company<T='get', R extends Record<string, unknown> = Record<string, unknown>> = StructureObject<");
  });
});

describe('relation generics', () => {
  it('generates generic relation types with default fallback to unknown', () => {
    const schema: MicroCMSSchemaType = {
      apiFields: [
        {
          fieldId: 'category',
          name: 'カテゴリ',
          kind: 'relation',
          required: true,
        },
        {
          fieldId: 'tags',
          name: 'タグ',
          kind: 'relationList',
          required: false,
        },
      ],
      customFields: [],
    };

    const { mainSchema } = convertSchema('blog', schema);
    expect(mainSchema[0]).toContain(
      "category: Reference<T, 'category' extends keyof R ? R['category'] : unknown>"
    );
    expect(mainSchema[1]).toContain(
      "tags?: Reference<T, 'tags' extends keyof R ? R['tags'] : unknown>[]"
    );
  });
});

describe('remote schema generation', () => {
  it('fetches schemas from Management API and generates types', async () => {
    const { generateFromRemote } = await import('../src/index');

    const originalFetch = global.fetch;
    try {
      global.fetch = async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.endsWith('/api/v1/apis')) {
          return {
            ok: true,
            json: async () => ({
              apis: [
                { name: 'ブログ', endpoint: 'blogs', type: 'list' },
                { name: '会社情報', endpoint: 'company', type: 'object' },
              ],
            }),
          } as unknown as Response;
        }
        if (urlStr.endsWith('/api/v1/apis/blogs')) {
          return {
            ok: true,
            json: async () => ({
              name: 'ブログ',
              endpoint: 'blogs',
              type: 'list',
              apiFields: [
                { fieldId: 'title', name: 'タイトル', kind: 'text', required: true },
              ],
              customFields: [],
            }),
          } as unknown as Response;
        }
        if (urlStr.endsWith('/api/v1/apis/company')) {
          return {
            ok: true,
            json: async () => ({
              name: '会社情報',
              endpoint: 'company',
              type: 'object',
              apiFields: [
                { fieldId: 'address', name: '住所', kind: 'text', required: true },
              ],
              customFields: [],
            }),
          } as unknown as Response;
        }
        return { ok: false, status: 404, statusText: 'Not Found' } as unknown as Response;
      };

      const result = await generateFromRemote({
        serviceDomain: 'test-domain',
        apiKey: 'test-api-key',
      });

      expect(result).toContain("export type blogs<T='get', R extends Record<string, unknown> = Record<string, unknown>> = Structure<");
      expect(result).toContain("export type company<T='get', R extends Record<string, unknown> = Record<string, unknown>> = StructureObject<");
      // 'blogs' is a list API, so it must be included in 'gets'
      expect(result).toMatch(/gets: {[\s\S]*'blogs': blogs<'gets'>[\s\S]*}/);
      // 'company' is an object API, so it should NOT be in 'gets'
      const getsMatch = result.match(/gets: {([\s\S]*?)}/);
      expect(getsMatch?.[1]).not.toContain("'company'");
    } finally {
      global.fetch = originalFetch;
    }
  });
});


