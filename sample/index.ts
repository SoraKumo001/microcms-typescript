type Reference<T, R> = T extends 'get' ? R : string | null;
type DateType = {
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
};

type Structure<T, P> = T extends 'get'
  ? { id: string } & DateType & Required<P>
  : Partial<DateType> & (T extends 'patch' ? Partial<P> : P);

export type test3<T='get'> = Structure<
T,
{
  /**
   * テキストフィールド
   */
  title: string
  /**
   * 数値
   */
  value?: number
  /**
   * セレクト(単数)
   */
  keyword2?: ['a' | 'b' | 'c']
  /**
   * セレクト(複数)
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
  gg?: { url: string, width: number, height: number }
  /**
   * 参照
   */
  reference?: Reference<T,unknown | null>
  /**
   * 参照(複数)
   */
  reference2?: Reference<T,unknown>[]
  /**
   * 日付
   */
  date?: string
  /**
   * 日付(必須)
   */
  date2: string
}>

interface test3_custom2 {
  /**
   * aa
   */
  aa?: string
  /**
   * bb
   */
  bb?: string
}
interface test3_custom3 {
  /**
   * aa
   */
  aa?: { url: string, width: number, height: number }
  /**
   * bb
   */
  bb?: test3_custom4[]
}
interface test3_custom4 {
  /**
   * aa
   */
  aa?: test3_custom3[]
}
export type test2<T='get'> = Structure<
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

export type contents<T='get'> = Structure<
T,
{
  /**
   * タイトル
   */
  title: string
  /**
   * 表示
   */
  visible: boolean
  /**
   * キーワード
   */
  keyword?: string
  /**
   * 親記事
   */
  parent?: Reference<T,unknown | null>
  /**
   * 本文
   */
  body?: string
}>


export interface EndPoints {
  get: {
    test3: test3<'get'>
    test2: test2<'get'>
    contents: contents<'get'>
  }
  post: {
    test3: test3<'post'>
    test2: test2<'post'>
    contents: contents<'post'>
  }
  put: {
    test3: test3<'put'>
    test2: test2<'put'>
    contents: contents<'put'>
  }
  patch: {
    test3: test3<'patch'>
    test2: test2<'patch'>
    contents: contents<'patch'>
  }
}
