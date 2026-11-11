/** Authoring-only data. None of these definitions ship in generated runtimes. */
export type Value = null | boolean | number | string | Value[] | { [key: string]: Value };
export interface TextField {
  kind: 'text';
  balanced?: boolean;
  /** Consume a sticky pattern match at the cursor, rather than scan to a delimiter. */
  token?: boolean;
  pattern?: string;
  prefix?: string[];
  reject?: string[];
  /** Additional structural delimiters for an opaque capture. */
  stop?: string[];
  allowEmpty?: boolean;
}
export interface ListField {
  kind: 'list';
  item: TextField | string[];
  min?: number;
  /** Finish a repetition when none of its alternatives match. */
  whileMatches?: boolean;
  stop?: string[];
  trailing?: boolean;
  /** Required only when examples cannot demonstrate a separator. */
  separator?: string;
}
export interface RefField { kind: 'ref'; item: string[]; }
export type Field = TextField | ListField | RefField;
export interface Production {
  examples: Record<string, Value>[];
  /** Paths in the default output; e.g. "name" or "payload.value". */
  fields: Record<string, Field>;
  /** Permit the inferred final literal to be absent at these boundaries / EOF. */
  optionalEnd?: string[];
}
export interface Schema {
  input: string;
  output: string;
  root: string;
  productions: Record<string, Production>;
  lexical?: {
    whitespace?: 'all' | 'horizontal' | 'none';
    pairs?: [string, string][];
    quotes?: string[];
    escape?: string;
    comments?: [string, string][];
    /** Prefixes introducing balanced regions, e.g. ${...} in a template. */
    regions?: [string, string][];
    /** Balanced regions whose contents do not recognize comments. */
    commentFree?: [string, string][];
  };
  encodings?: Record<string, { from: string; format: 'json' }>;
}
export const defineSchema = (schema: Schema): Schema => schema;
export const text = (options: Omit<TextField, 'kind'> = {}): TextField => ({ kind: 'text', ...options });
export const list = (item: ListField['item'], options: Omit<ListField, 'kind' | 'item'> = {}): ListField => ({ kind: 'list', item, ...options });

export const ref = (item: string[]): RefField => ({ kind: 'ref', item });
