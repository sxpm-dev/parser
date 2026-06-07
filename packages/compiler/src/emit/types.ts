// Phase 3 — emit type aliases + overloaded render/stringify signatures.
//
// The v2 backend writes `// @ts-nocheck` at the top of every generated file,
// so the *body* of the file is not type-checked — but type ANNOTATIONS on
// exports survive declaration emit, so consumers see the inferred types
// through the module boundary.
//
// What this module emits:
//   1. A `// --- Inferred types ---` block of `export type <Node>_<target>`
//      aliases (one per (NodeType, target) pair in `StructureTypes`).
//   2. A list of `export function render` overload signatures for the public
//      `render(input, options)` entry point — one signature per declared
//      target (plus a no-`target` form when the schema declares a default
//      target). The caller of v2/index.ts inserts these immediately before
//      the implementation signature.
//   3. The same for `stringify(value, options)`.

import type { InferredSchema } from '../model.ts';
import {
  aliasNameFor,
  inferStructureTypes,
  type StructureTypes,
  type TsType,
} from '../infer/structure-types.ts';
import { jsString } from './strings.ts';

export type TypeEmission = {
  // Block of `export type <Node>_<target> = ...;` declarations. Empty when
  // the schema has no productions (defensive — that case is rejected
  // upstream).
  readonly aliasBlock: string;
  // Overload signatures for `render` — terminated declarations (no body).
  // The implementation signature follows in v2/index.ts.
  readonly renderOverloads: string;
  // Overload signatures for `stringify`.
  readonly stringifyOverloads: string;
};

export function emitTypes(schema: InferredSchema): TypeEmission {
  const types = inferStructureTypes(schema);
  const aliasBlock = emitAliasBlock(types);
  const renderOverloads = emitRenderOverloads(schema, types);
  const stringifyOverloads = emitStringifyOverloads(schema, types);
  return { aliasBlock, renderOverloads, stringifyOverloads };
}

// ---------------------------------------------------------------------------
// Alias block
// ---------------------------------------------------------------------------

function emitAliasBlock(types: StructureTypes): string {
  if (types.aliases.length === 0) return '';
  const lines: string[] = ['// --- Inferred types ---'];
  for (const alias of types.aliases) {
    lines.push(`export type ${alias.aliasName} = ${renderTs(alias.type)};`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Render overloads
// ---------------------------------------------------------------------------

function emitRenderOverloads(schema: InferredSchema, types: StructureTypes): string {
  const rootName = schema.rootType;
  const lines: string[] = [];
  for (const target of types.targets) {
    const rt = aliasNameFor(rootName, target);
    lines.push(
      `export function render(input: string, options: { target: ${jsString(target)}; mode?: ParseMode }): ${rt};`,
    );
  }
  if (schema.defaultTarget !== undefined) {
    const defaultRt = aliasNameFor(rootName, schema.defaultTarget);
    lines.push(
      `export function render(input: string, options?: { target?: undefined; mode?: ParseMode }): ${defaultRt};`,
    );
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Stringify overloads
// ---------------------------------------------------------------------------

function emitStringifyOverloads(schema: InferredSchema, types: StructureTypes): string {
  const rootName = schema.rootType;
  const lines: string[] = [];
  for (const target of types.targets) {
    const rt = aliasNameFor(rootName, target);
    lines.push(
      `export function stringify(value: ${rt}, options: { target: ${jsString(target)} }): string;`,
    );
  }
  if (schema.defaultTarget !== undefined) {
    const defaultRt = aliasNameFor(rootName, schema.defaultTarget);
    lines.push(
      `export function stringify(value: ${defaultRt}, options?: { target?: undefined }): string;`,
    );
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// TS source rendering
// ---------------------------------------------------------------------------

export function renderTs(t: TsType): string {
  switch (t.kind) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'unknown':
      return 'unknown';
    case 'literal':
      if (typeof t.value === 'string') return jsString(t.value);
      if (typeof t.value === 'number') return String(t.value);
      return t.value ? 'true' : 'false';
    case 'ref':
      return t.name;
    case 'union':
      return t.members.map(parenthesizeForUnion).join(' | ');
    case 'array': {
      const inner = renderTs(t.element);
      if (needsParens(t.element)) return `(${inner})[]`;
      return `${inner}[]`;
    }
    case 'tuple':
      return `[${t.elements.map(renderTs).join(', ')}]`;
    case 'object': {
      if (t.fields.length === 0) return '{}';
      const fields = t.fields
        .map((f) => `${objectKey(f.name)}: ${renderTs(f.type)}`)
        .join('; ');
      return `{ ${fields} }`;
    }
    case 'record':
      return `Record<${renderTs(t.key)}, ${renderTs(t.value)}>`;
  }
}

function parenthesizeForUnion(t: TsType): string {
  if (t.kind === 'union') return `(${renderTs(t)})`;
  return renderTs(t);
}

function needsParens(t: TsType): boolean {
  return t.kind === 'union';
}

function objectKey(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return key;
  return jsString(key);
}
