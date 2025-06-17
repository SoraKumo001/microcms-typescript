# microcms-typescript

[![](https://img.shields.io/npm/l/microcms-typescript)](https://www.npmjs.com/package/microcms-typescript)
[![](https://img.shields.io/npm/v/microcms-typescript)](https://www.npmjs.com/package/microcms-typescript)
[![](https://img.shields.io/npm/dw/microcms-typescript)](https://www.npmjs.com/package/microcms-typescript)
[![](https://deepwiki.com/badge.svg)](https://deepwiki.com/SoraKumo001/microcms-typescript)

## description

Convert [MicroCMS](https://microcms.io/) schema to TypeScript type definitions.

## usage

`microcms-typescript src-dir [dist-file]`

Use the file name as the type name.  
If there are multiple schema files with the same type name, the one with the latest date will be used for conversion.

## For output types

api-contents-20210905132840.json -> cms-types.ts

```json
{
  "apiFields": [
    {
      "idValue": "g8ZUm5uLha",
      "fieldId": "title",
      "name": "title",
      "kind": "text",
      "required": true,
      "isUnique": false
    },
    { "fieldId": "visible", "name": "visible", "kind": "boolean", "required": true },
    { "fieldId": "keyword", "name": "keyword", "kind": "textArea" },
    { "fieldId": "parent", "name": "parent", "kind": "relation" },
    { "fieldId": "body", "name": "body", "kind": "textArea" }
  ],
  "customFields": []
}
```

```ts
import type { EndPoints } from './cms-types';

let a: EndPoints['gets']['contents'];
/*
{
    limit:number
    offset:number
    totalCount:number
    contents:{
        id: string;
        title: string;
        visible: boolean;
        keyword?: string;
        parent?: string;
        body?: string;
        createdAt: string;
        updatedAt: string;
        publishedAt: string;
        revisedAt: string;
    }[]
}
*/

let b: EndPoints['get']['contents'];
/*
{
    id: string;
    title: string;
    visible: boolean;
    keyword?: string;
    parent?: string;
    body?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    revisedAt: string;
}
*/

let c: EndPoints['post']['contents'];
let d: EndPoints['put']['contents'];
/*
{
    title: string;
    visible: boolean;
    keyword?: string;
    parent?: string;
    body?: string;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string;
    revisedAt?: string;
}
*/

let e: EndPoints['patch']['contents'];
/*
{
    title?: string;
    visible?: boolean;
    keyword?: string;
    parent?: string;
    body?: string;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string;
    revisedAt?: string;
}
*/
```
