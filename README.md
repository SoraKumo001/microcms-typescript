# microcms-typescript

[![npm version](https://img.shields.io/npm/v/microcms-typescript.svg)](https://www.npmjs.com/package/microcms-typescript)
[![npm license](https://img.shields.io/npm/l/microcms-typescript.svg)](https://www.npmjs.com/package/microcms-typescript)
[![npm downloads](https://img.shields.io/npm/dw/microcms-typescript.svg)](https://www.npmjs.com/package/microcms-typescript)
[![Release](https://github.com/SoraKumo001/microcms-typescript/actions/workflows/release.yml/badge.svg)](https://github.com/SoraKumo001/microcms-typescript/actions/workflows/release.yml)

Convert [microCMS](https://microcms.io/) schema JSON files to TypeScript type definitions.

- ⚡️ **Zero Config**: Automatically derives endpoint names from schema filenames.
- 📦 **Rich Field Support**: Relations, Repeaters, Custom Fields, Media/MediaList, Rich Editor (v1/v2), etc.
- 🔄 **CRUD Type Generation**: Generates dedicated type definitions for `get`, `gets`, `post`, `put`, and `patch`.
- 🛠 **microcms-js-sdk Friendly**: Designed to work seamlessly with the official SDK.

---

## Installation & Quick Start

### Using `npx` (No install required)

```bash
npx microcms-typescript <schemas-dir> [output-file]

# Example:
npx microcms-typescript ./schemas ./types/microcms.ts
```

If `output-file` is omitted, the generated TypeScript code will be printed to stdout.

### Installing in your project

```bash
# npm
npm install -D microcms-typescript

# pnpm
pnpm add -D microcms-typescript

# yarn
yarn add -D microcms-typescript
```

Add a script to your `package.json`:

```json
{
  "scripts": {
    "gen:types": "microcms-typescript schemas types/microcms.ts"
  }
}
```

---

## How It Works

### 1. Export schema files from microCMS

In the microCMS management console:

1. Navigate to **API Settings** > **Schema**.
2. Click **Export** to download the schema JSON file.
3. Save the downloaded files into your schema directory (e.g., `./schemas/`).

### 2. File Naming Convention

microCMS exports schema files in the following format:

```text
api-<endpointName>-<timestamp>.json
```

For example:

- `api-news-20240101120000.json` → Endpoint name: `news`
- `api-news_categories-20240101120500.json` → Endpoint name: `news_categories` (converted to camelCase `newsCategories` for type names)

> [!NOTE]
> If multiple schema files exist for the same endpoint, `microcms-typescript` will automatically use the file with the **latest date/timestamp**.

---

## Supported Fields & Type Mapping

| Field Name        | Type Name                    | TypeScript Output                   | Notes                                                          |
| ----------------- | ---------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| Text              | `text`                       | `string`                            | Optional (`?`) if not required                                 |
| Text Area         | `textArea`                   | `string`                            |                                                                |
| Rich Editor       | `richEditor`, `richEditorV2` | `string`                            | Returns HTML string                                            |
| Number            | `number`                     | `number`                            |                                                                |
| Select (Single)   | `select`                     | `['value1' \| 'value2']`            | Tuple of union                                                 |
| Select (Multiple) | `select`                     | `('value1' \| 'value2')[]`          | Array of union                                                 |
| Boolean           | `boolean`                    | `boolean`                           |                                                                |
| Date              | `date`                       | `string`                            | ISO 8601 string                                                |
| Media             | `media`                      | `MediaType`                         | `{ url: string; width: number; height: number; alt?: string }` |
| Media List        | `mediaList`                  | `MediaType[]`                       | Array of `MediaType`                                           |
| File              | `file`                       | `{ url: string; fileSize: number }` |                                                                |
| Relation          | `relation`                   | `Reference<T, unknown>`             | Resolves based on operation (`get` vs `post`)                  |
| Relation List     | `relationList`               | `Reference<T, unknown>[]`           | Array of references                                            |
| Custom Field      | `custom`                     | `<Endpoint>_<CustomFieldId>`        | Generated dedicated interface                                  |
| Repeater          | `repeater`                   | `(<Custom1> \| <Custom2>)[]`        | Union array of custom fields                                   |

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
   - `MediaType`: Media asset details.
   - `Structure<T, P>`: Automatically attaches metadata fields (`id`, `createdAt`, `updatedAt`, `publishedAt`, `revisedAt`) based on the operation mode.
2. **Endpoint Types**:
   - `<EndpointName><T='get'>`: Generic type parameterized by operation mode (`'get' | 'gets' | 'post' | 'put' | 'patch'`).
3. **EndPoints Interface**:
   - `EndPoints['get']`: Detailed single content type.
   - `EndPoints['gets']`: Wrapped list type with `contents`, `totalCount`, etc.
   - `EndPoints['post']` / `EndPoints['put']`: Content creation / replacement payload type.
   - `EndPoints['patch']`: Partial payload type for partial updates.

---

## License

[MIT](LICENSE)
