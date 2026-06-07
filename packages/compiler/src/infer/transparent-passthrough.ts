// Phase 5g — transparent-passthrough production detection.
//
// A "transparent passthrough" production is one whose AST body is just a
// recursive reference back into the same node type, with literal
// punctuation wrappers in the source:
//
//   relation('Expr', {
//     input: '(a)',
//     encodings: {
//       src: parse([literal('('), span('inner', 'a').of('Expr'), literal(')')]),
//       ast: $.inner,
//     },
//   })
//
// On the forward path the production behaves like any other primary —
// the Pratt loop's primary dispatcher tries it like any alt, consumes
// the wrapping literals, recurses into the same node type for the inner
// expression, and returns the inner's AST verbatim. The wrapping syntax
// is erased: `(a)` and `a` produce the same AST.
//
// On the inverse path the production cannot be dispatched into, because
// its AST shape is identical to whatever the inner production produces —
// the inverse dispatcher would either be ambiguous (two productions
// claim the same shape) or would always emit redundant parens. The
// paren-aware stringify (Phase 5c) already emits parens by precedence
// rules; the transparent-passthrough production exists only to allow
// the parser to consume explicit parens (or other transparent
// wrappings) that an author wrote.
//
// This pass detects such productions so they can be filtered out of
// inverse derivation. Domainless — shape-only detection.

import { isStructureRef } from '@parser2/parser';
import type { RenderBody } from '@parser2/parser';
import type { NodeTypeInfo, Production, ResolvedSpan } from '../model.ts';

export type TransparentPassthroughInfo = {
  // Index within `NodeTypeInfo.productions`.
  readonly prodIdx: number;
  // The capture name whose value is returned verbatim by the AST body.
  readonly innerCapture: string;
};

// Map from node type name → list of passthrough production infos. A node
// type may have multiple wrappers (e.g. parens AND brackets); each one is
// recognized independently.
export type TransparentPassthroughMap = ReadonlyMap<
  string,
  ReadonlyArray<TransparentPassthroughInfo>
>;

export function detectTransparentPassthroughs(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): TransparentPassthroughMap {
  const out = new Map<string, TransparentPassthroughInfo[]>();
  for (const info of nodeTypes.values()) {
    for (let i = 0; i < info.productions.length; i++) {
      const match = matchTransparentPassthrough(info.name, info.productions[i]!, i);
      if (match === null) continue;
      const list = out.get(info.name) ?? [];
      list.push(match);
      out.set(info.name, list);
    }
  }
  return out;
}

// Return the inner-capture name if the production's `ast` body is exactly
// `$.x` where x is a span recursing back into the same node type with no
// modifiers that would change the produced value shape.
function matchTransparentPassthrough(
  nodeType: string,
  production: Production,
  prodIdx: number,
): TransparentPassthroughInfo | null {
  const astEntry = production.renders.get('ast');
  if (astEntry === undefined) return null;
  const body = astEntry.body;
  if (!isBareSpanValueRef(body)) return null;
  const innerCaptureName = body.name;
  // Locate the span this ref points at and verify it recurses into
  // exactly this node type with no value-altering modifiers.
  const innerSpan = production.spans.find((s) => s.name === innerCaptureName);
  if (!innerSpan) return null;
  if (!isSelfRecursivePassthrough(innerSpan, nodeType)) return null;
  return { prodIdx, innerCapture: innerCaptureName };
}

function isBareSpanValueRef(body: RenderBody): body is {
  readonly __ref: 'span-value';
  readonly name: string;
} {
  if (!isStructureRef(body)) return false;
  return body.__ref === 'span-value';
}

function isSelfRecursivePassthrough(span: ResolvedSpan, nodeType: string): boolean {
  if (span.recursiveRoles.length !== 1) return false;
  if (span.recursiveRoles[0] !== nodeType) return false;
  // Modifiers that would change the value shape (optional → nullable,
  // repeats → array, until/rawUntil → string slice) break the
  // transparent-passthrough property: the wrapper would produce a value
  // shape distinguishable from the inner's, and the inverse dispatcher
  // could legitimately route through it.
  for (const m of span.modifiers) {
    if (
      m.kind === 'optional' ||
      m.kind === 'repeats' ||
      m.kind === 'until' ||
      m.kind === 'rawUntil' ||
      m.kind === 'indent'
    ) {
      return false;
    }
  }
  return true;
}
