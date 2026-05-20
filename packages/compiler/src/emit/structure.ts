import { isStructureRef, type StructureValue } from '@parser2/parser';
import { jsString } from './strings.ts';

// Emits a JS expression that constructs the structure literal, substituting
// $.name with the corresponding captured local-var expression and
// $.name.present with a boolean expression provided by the caller.

export type StructureBindings = {
  // For each named span, the JS expression that evaluates to its captured
  // value. Optional spans bind a `name | null` expression.
  readonly valueExpr: ReadonlyMap<string, string>;
  // For each optional named span, the JS expression that evaluates to
  // its presence boolean.
  readonly presenceExpr: ReadonlyMap<string, string>;
  // For each named span, JS expressions that evaluate to the source-offset
  // of the start and end of the consumed region. Used by $.gap() to compute
  // raw source slices between spans.
  readonly startOffExpr: ReadonlyMap<string, string>;
  readonly endOffExpr: ReadonlyMap<string, string>;
};

export type StructureEmitOptions = {
  readonly omitRaws?: boolean;
};

export function emitStructureExpr(
  value: StructureValue,
  bindings: StructureBindings,
  options: StructureEmitOptions = {},
): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return jsString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isStructureRef(value)) {
    if (value.__ref === 'span-value') {
      const expr = bindings.valueExpr.get(value.name);
      if (!expr) throw new Error(`Structure references unknown span '$.${value.name}'`);
      return expr;
    }
    if (value.__ref === 'span-presence') {
      const expr = bindings.presenceExpr.get(value.name);
      if (!expr) throw new Error(`Structure references presence of unknown span '$.${value.name}.present'`);
      return expr;
    }
    if (value.__ref === 'span-gap') {
      const fromEnd = bindings.endOffExpr.get(value.from);
      const toStart = bindings.startOffExpr.get(value.to);
      if (!fromEnd) throw new Error(`$.gap('${value.from}', ...) — unknown span '${value.from}'`);
      if (!toStart) throw new Error(`$.gap(..., '${value.to}') — unknown span '${value.to}'`);
      return `state.input.slice(${fromEnd}, ${toStart})`;
    }
    if (value.__ref === 'span-tail') {
      const fromEnd = bindings.endOffExpr.get(value.from);
      if (!fromEnd) throw new Error(`$.tail('${value.from}') — unknown span '${value.from}'`);
      // Slice to the production's source.end (__endOff), which is the end
      // of the last consumed token — matches PostCSS's convention of not
      // including trailing whitespace at the root level.
      return `state.input.slice(${fromEnd}, __endOff)`;
    }
    if (value.__ref === 'span-raw') {
      const startExpr = bindings.startOffExpr.get(value.name);
      const endExpr = bindings.endOffExpr.get(value.name);
      if (!startExpr || !endExpr) throw new Error(`$.raw('${value.name}') — unknown span '${value.name}'`);
      return `state.input.slice(${startExpr}, ${endExpr})`;
    }
    if (value.__ref === 'span-ends-with') {
      const endExpr = bindings.endOffExpr.get(value.name);
      if (!endExpr) throw new Error(`$.endsWith('${value.name}', ...) — unknown span '${value.name}'`);
      const lit = jsString(value.suffix);
      return `(state.input.slice(${endExpr} - ${value.suffix.length}, ${endExpr}) === ${lit})`;
    }
    if (value.__ref === 'span-comment-left') {
      const startExpr = bindings.startOffExpr.get(value.name);
      const endExpr = bindings.endOffExpr.get(value.name);
      if (!startExpr || !endExpr) throw new Error(`$.commentLeft('${value.name}') — unknown span '${value.name}'`);
      return `commentLeft(state.input.slice(${startExpr}, ${endExpr}))`;
    }
    // span-comment-right
    const startExpr = bindings.startOffExpr.get(value.name);
    const endExpr = bindings.endOffExpr.get(value.name);
    if (!startExpr || !endExpr) throw new Error(`$.commentRight('${value.name}') — unknown span '${value.name}'`);
    return `commentRight(state.input.slice(${startExpr}, ${endExpr}))`;
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => emitStructureExpr(v, bindings, options));
    return `[${items.join(', ')}]`;
  }
  // Object literal
  const entries = Object.entries(value as Record<string, StructureValue>)
    .filter(([key]) => !(options.omitRaws && key === 'raws'))
    .map(([key, val]) => `${jsObjectKey(key)}: ${emitStructureExpr(val, bindings, options)}`);
  return `{ ${entries.join(', ')} }`;
}

function jsObjectKey(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return key;
  return jsString(key);
}
