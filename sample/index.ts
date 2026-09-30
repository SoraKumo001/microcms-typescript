type Reference<T, R> = T extends 'get' ? R : string | null;
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
  : Partial<DateType> & (T extends 'patch' ? Partial<P> : P);

export type test3<T='get', R extends Record<string, unknown> = Record<string, unknown>> = Structure<
T,
{
  /**
   * テキストフィールド
   * @required
   */
  title: string
  /**
   * 数値
   */
  value?: number
  /**
   * セレクト(単数)
   * @values a, b, c
   */
  keyword2?: ['a' | 'b' | 'c']
  /**
   * セレクト(複数)
   * @values aaa, bbb, ccc
   */
  keyword?: ('aaa' | 'bbb' | 'ccc')[]
  /**
   * リッチエディタ
   */
  content?: string
  /**
   * 真偽値
   */
  visible?: boolean
  /**
   * カスタム
   */
  cc?: test3_custom2
  /**
   * dd
   */
  dd?: (test3_custom2 | test3_custom3 | test3_custom4)[]
  /**
   * gg
   */
  gg?: MediaType
  /**
   * 参照
   */
  reference?: Reference<T, ('reference' extends keyof R ? R['reference'] : unknown) | null>
  /**
   * 参照(複数)
   */
  reference2?: Reference<T, 'reference2' extends keyof R ? R['reference2'] : unknown>[]
  /**
   * 日付
   */
  date?: string
  /**
   * 日付(必須)
   * @required
   */
  date2: string
}>

export interface test3_custom2 {
  fieldId: 'custom2'
  /**
   * aa
   */
  aa?: string
  /**
   * bb
   */
  bb?: string
}
export interface test3_custom3 {
  fieldId: 'custom3'
  /**
   * aa
   */
  aa?: MediaType
  /**
   * bb
   */
  bb?: test3_custom4[]
}
export interface test3_custom4 {
  fieldId: 'custom4'
  /**
   * aa
   */
  aa?: test3_custom3[]
}
export type test2<T='get', R extends Record<string, unknown> = Record<string, unknown>> = Structure<
T,
{
  /**
   * タイトル
   */
  title?: string
  /**
   * 本文
   */
  body?: string
}>

export type newsCategories<T='get', R extends Record<string, unknown> = Record<string, unknown>> = Structure<
T,
{
  /**
   * 名前
   * @required
   */
  name: string
}>

export type news<T='get', R extends Record<string, unknown> = Record<string, unknown>> = Structure<
T,
{
  /**
   * カテゴリー
   * @required
   */
  category: Reference<T, 'category' extends keyof R ? R['category'] : unknown>
  /**
   * タイトル
   * @required
   */
  title: string
  /**
   * 内容
   */
  contents?: (news_richEditor | news_html | news_markdown | news_image)[]
  /**
   * カバー画像
   */
  coverImage?: MediaType
  /**
   * 関連お知らせ
   */
  relatedNews?: Reference<T, 'relatedNews' extends keyof R ? R['relatedNews'] : unknown>[]
}>

export interface news_richEditor {
  fieldId: 'richEditor'
  /**
   * リッチエディタ
   * @required
   */
  content: string
}
export interface news_html {
  fieldId: 'html'
  /**
   * HTML
   * @required
   */
  content: string
}
export interface news_markdown {
  fieldId: 'markdown'
  /**
   * Markdown
   * @required
   */
  content: string
}
export interface news_image {
  fieldId: 'image'
  /**
   * 代替えテキスト
   */
  alt?: string
  /**
   * 画像
   * @required
   */
  image: MediaType
  /**
   * 配置
   * @required
   * @values 左寄せ, 中央寄せ, 右寄せ
   */
  position: ['左寄せ' | '中央寄せ' | '右寄せ']
}
export type contents<T='get', R extends Record<string, unknown> = Record<string, unknown>> = Structure<
T,
{
  /**
   * タイトル
   * @required
   */
  title: string
  /**
   * 表示
   * @required
   */
  visible: boolean
  /**
   * キーワード
   */
  keyword?: string
  /**
   * 親記事
   */
  parent?: Reference<T, ('parent' extends keyof R ? R['parent'] : unknown) | null>
  /**
   * 本文
   */
  body?: string
}>


export interface EndPoints {
  get: {
    'test3': test3<'get'>
    'test2': test2<'get'>
    'news-categories': newsCategories<'get'>
    'news': news<'get'>
    'contents': contents<'get'>
  }
  gets: {
    'test3': test3<'gets'>
    'test2': test2<'gets'>
    'news-categories': newsCategories<'gets'>
    'news': news<'gets'>
    'contents': contents<'gets'>
  }
  post: {
    'test3': test3<'post'>
    'test2': test2<'post'>
    'news-categories': newsCategories<'post'>
    'news': news<'post'>
    'contents': contents<'post'>
  }
  put: {
    'test3': test3<'put'>
    'test2': test2<'put'>
    'news-categories': newsCategories<'put'>
    'news': news<'put'>
    'contents': contents<'put'>
  }
  patch: {
    'test3': test3<'patch'>
    'test2': test2<'patch'>
    'news-categories': newsCategories<'patch'>
    'news': news<'patch'>
    'contents': contents<'patch'>
  }
}
