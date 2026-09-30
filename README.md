# microcms-typescript

[![npm version](https://img.shields.io/npm/v/microcms-typescript.svg)](https://www.npmjs.com/package/microcms-typescript)
[![npm license](https://img.shields.io/npm/l/microcms-typescript.svg)](https://www.npmjs.com/package/microcms-typescript)
[![npm downloads](https://img.shields.io/npm/dw/microcms-typescript.svg)](https://www.npmjs.com/package/microcms-typescript)
[![Test](https://github.com/SoraKumo001/microcms-typescript/actions/workflows/test.yml/badge.svg)](https://github.com/SoraKumo001/microcms-typescript/actions/workflows/test.yml)
[![Release](https://github.com/SoraKumo001/microcms-typescript/actions/workflows/release.yml/badge.svg)](https://github.com/SoraKumo001/microcms-typescript/actions/workflows/release.yml)

Convert [microCMS](https://microcms.io/) schema JSON files or remote APIs to TypeScript type definitions.

- ⚡️ **Zero Config & Remote Sync**: Fetch directly from microCMS Management API or local JSON files.
- 📁 **Directory or Single File**: Specify either a directory containing schemas or a single JSON file.
- 📦 **Rich Field Support**: Relations, Repeaters, Custom Fields, Media/MediaList, Extension Fields (`iframe`), Rich Editor (v1/v2), etc.
- 🔗 **Generic Relation Typing**: Type-safe relational fields without arbitrary type assertions.
- 📑 **List & Object API Support**: Automatically recognizes Single Content (Object) vs List API types.
- 🏷 **Type-safe JSDoc**: Rich doc comments with `@required` and `@values` annotations.
- 🔠 **Naming Conventions**: Supports both `camelCase` (default) and `PascalCase` (`--pascal-case`).
- ⚙️ **Config File Support**: Convenient `microcms-typescript.config.json` configuration.
- 🔄 **CRUD Type Generation**: Generates dedicated type definitions for `get`, `gets`, `post`, `put`, and `patch`.
- 🛠 **microcms-js-sdk Friendly**: Designed to work seamlessly with the official SDK.

---

## Installation & Quick Start

### 1. Remote Mode (Fetch from microCMS Management API)

No need to manually export JSON files. Synchronize types directly from your microCMS service:

```bash
# Using CLI options
npx microcms-typescript --service-domain YOUR_SERVICE_DOMAIN --api-key YOUR_MANAGEMENT_API_KEY ./types/microcms.ts

# Or with environment variables (MICROCMS_SERVICE_DOMAIN and MICROCMS_API_KEY)
npx microcms-typescript -o ./types/microcms.ts --pascal-case
```

### 2. Local File / Directory Mode

```bash
# Directory input (outputs to file)
npx microcms-typescript ./schemas ./types/microcms.ts

# Single file input
npx microcms-typescript ./schemas/api-news-20240101.json ./types/news.ts

# Generate with PascalCase type names (e.g., NewsCategories)
npx microcms-typescript ./schemas ./types/microcms.ts --pascal-case
```

If the output path is omitted, the generated TypeScript code is printed to `stdout`.

### 3. Using a Configuration File

Create a `microcms-typescript.config.json` in your project root:

```json
{
  "serviceDomain": "your-service-domain",
  "apiKey": "your-management-api-key",
  "output": "./src/types/microcms.ts",
  "pascalCase": true
}
```

Then simply run:

```bash
npx microcms-typescript
```

---

## CLI Options

| Option / Flag               | Alias | Description                                                   |
| --------------------------- | ----- | ------------------------------------------------------------- |
| `<src-dir-or-file>`         |       | Input directory or schema JSON file path                      |
| `[dist-file]`               | `-o`  | Output TypeScript file destination                            |
| `--service-domain <domain>` | `-s`  | microCMS service domain for Management API                    |
| `--api-key <key>`           | `-k`  | microCMS Management API key                                   |
| `--pascal-case`             |       | Generate PascalCase type names instead of camelCase           |
| `--config <path>`           | `-c`  | Path to custom configuration JSON file                        |

---

## Supported Fields & Type Mapping

| Field Name        | Type Name                    | TypeScript Output                    | Notes                                                           |
| ----------------- | ---------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| Text              | `text`                       | `string`                             | Optional (`?`) if not required                                  |
| Text Area         | `textArea`                   | `string`                             |                                                                 |
| Rich Editor       | `richEditor`, `richEditorV2` | `string`                             | Returns HTML string                                             |
| Number            | `number`                     | `number`                             |                                                                 |
| Select (Single)   | `select`                     | `['value1' \| 'value2']`             | Tuple of union (`@values` added to JSDoc)                       |
| Select (Multiple) | `select`                     | `('value1' \| 'value2')[]`           | Array of union (`@values` added to JSDoc)                       |
| Boolean           | `boolean`                    | `boolean`                            |                                                                 |
| Date              | `date`                       | `string`                             | ISO 8601 string                                                 |
| Media             | `media`                      | `MediaType`                          | `{ url: string; width?: number; height?: number; alt?: string }`|
| Media List        | `mediaList`                  | `MediaType[]`                        | Array of `MediaType`                                            |
| File              | `file`                       | `{ url: string; fileSize: number }`  |                                                                 |
| Extension Field   | `iframe`                     | `any`                                | Custom extension iframe field                                   |
| Relation          | `relation`                   | `Reference<T, R['field']>`           | Generic typed reference (`unknown` by default)                 |
| Relation List     | `relationList`               | `Reference<T, R['field']>[]`         | Array of generic references                                     |
| Custom Field      | `custom`                     | `<Endpoint>_<CustomFieldId>`         | Generated exported interface                                    |
| Repeater          | `repeater`                   | `(<Custom1> \| <Custom2>)[]`         | Union array of custom fields                                    |

---

## Relation Type Generics

By default, relational fields resolve to `unknown`. You can override the referenced types with the `R` generic parameter:

```typescript
import type { News, NewsCategories } from './types/microcms';

// Specify the related category type
type Article = News<'get', { category: NewsCategories<'get'> }>;

// article.category is fully typed as NewsCategories<'get'>
const categoryName = article.category.name;
```

---

## Usage with `microcms-js-sdk`

`microcms-typescript` generates an `EndPoints` interface that groups all types by HTTP method:

```typescript
import { createClient } from 'microcms-js-sdk';
import type { EndPoints } from './types/microcms';

const client = createClient({
  serviceDomain: 'YOUR_SERVICE_DOMAIN',
  apiKey: 'YOUR_API_KEY',
});

// List contents (gets)
const newsList = await client.getList<EndPoints['gets']['news']['contents'][number]>({
  endpoint: 'news',
});

// Single content detail (get)
const article = await client.get<EndPoints['get']['news']>({
  endpoint: 'news',
  contentId: 'your-content-id',
});

// Create new content (post)
await client.create<EndPoints['post']['news']>({
  endpoint: 'news',
  content: {
    title: 'Hello World',
    // ...
  },
});
```

---

## Generated Type Structure

The generated output includes:

1. **Common Utility Types**:
   - `Reference<T, R>`: Automatically handles reference types (`R` on `get`, `string | null` on mutation).
   - `GetsType<T>`: Standard list response wrapper (`contents`, `totalCount`, `offset`, `limit`).
   - `DateType`: Metadata date fields (`createdAt`, `updatedAt`, `publishedAt: string | null`, `revisedAt: string | null`).
   - `MediaType`: Media asset details with optional width/height.
   - `Structure<T, P>`: Combines system fields (`id`, `DateType`) and your schema payload.
   - `StructureObject<T, P>`: Metadata for Object (single content) API without `id` field.
2. **Endpoint Types**:
   - `<EndpointName><T='get', R=...>`: Generic type parameterized by operation mode and relation mappings.
3. **EndPoints Interface**:
   - `EndPoints['get']`: Detailed single content type.
   - `EndPoints['gets']`: Wrapped list type (automatically omitted for Object API endpoints).
   - `EndPoints['post']` / `EndPoints['put']`: Content creation / replacement payload type.
   - `EndPoints['patch']`: Partial payload type for partial updates.

---

## License

[MIT](LICENSE)
