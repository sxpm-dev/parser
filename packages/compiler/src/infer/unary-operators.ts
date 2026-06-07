// Phase 5f — unary-prefix-operator detection.
//
// Walks each NodeTypeInfo and identifies productions of shape
//
//   [operatorSpan(alts), recursiveSpan(roleSelf)]
//
// where:
//   - the first span is class `'operator'` carrying an `alts` refinement
//     that lists exactly which operators are valid in unary position
//     (`.operator(['!', '~'])`). The alts list scopes unary recognition
//     so a Pratt schema can declare different operator sets for binary
//     and unary positions (e.g. `*` is binary-only; `!` is unary-only).
//   - the second span recurses into the same node type (the "operand").
//
// The body must reference both captures so the inverse direction can
// reconstruct the AST. The detected unary production carries:
//   - the production index;
//   - the operator and operand capture names (schema-author chosen);
//   - the set of operator literals the production accepts in unary
//     position.
//
// Domainless — pure shape detection over the closed DSL vocabulary.

import type { NodeTypeInfo, Production, ResolvedSpan } from '../model.ts';
import { isStructureRef } from '@parser2/parser';
import type { RenderBody, StructureRef } from '@parser2/parser';

export type UnaryProductionInfo = {
  readonly prodIdx: number;
  readonly opCapture: string;
  readonly operandCapture: string;
  // Operator literals this unary production accepts. Derived from the
  // operator span's `alts` refinement.
  readonly operatorAlts: ReadonlySet<string>;
};

export type UnaryProductionMap = ReadonlyMap<string, UnaryProductionInfo>;

export function detectUnaryProductions(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): UnaryProductionMap {
  const out = new Map<string, UnaryProductionInfo>();
  for (const info of nodeTypes.values()) {
    let found: UnaryProductionInfo | undefined;
    for (let i = 0; i < info.productions.length; i++) {
      const candidate = matchUnaryProduction(info.name, info.productions[i]!, i);
      if (candidate === null) continue;
      if (found !== undefined) {
        throw new Error(
          `unary-operator detection: node type '${info.name}' has more than one production matching the [operator, recursive] shape. Use a single unary production and list every unary operator literal in its \`.operator([...])\` alts.`,
        );
      }
      found = candidate;
    }
    if (found !== undefined) out.set(info.name, found);
  }
  return out;
}

function matchUnaryProduction(
  nodeType: string,
  production: Production,
  prodIdx: number,
): UnaryProductionInfo | null {
  const spans = production.spans;
  if (spans.length !== 2) return null;
  const op = spans[0]!;
  const operand = spans[1]!;

  if (!isUnaryOperatorSpan(op)) return null;
  if (!isSelfRecursiveOperand(operand, nodeType)) return null;
  if (op.name === undefined || operand.name === undefined) return null;

  const astEntry = production.renders.get('ast');
  if (astEntry === undefined) return null;
  const refs = collectCaptureRefs(astEntry.body);
  if (!refs.has(op.name) || !refs.has(operand.name)) return null;

  const alts = extractAlts(op);
  if (alts === null) return null;
  return {
    prodIdx,
    opCapture: op.name,
    operandCapture: operand.name,
    operatorAlts: alts,
  };
}

function isUnaryOperatorSpan(span: ResolvedSpan): boolean {
  if (span.class !== 'operator') return false;
  if (span.recursiveRoles.length !== 0) return false;
  for (const m of span.modifiers) {
    if (m.kind === 'repeats' || m.kind === 'until' || m.kind === 'rawUntil') return false;
  }
  // Must have an `alts` refinement — without it the unary set is
  // unbounded, which would force every declared operator (including pure
  // binary ones like `*`) to also be a unary prefix.
  return span.refinements.some((r) => r.name === 'alts');
}

function isSelfRecursiveOperand(span: ResolvedSpan, nodeType: string): boolean {
  if (span.recursiveRoles.length !== 1) return false;
  if (span.recursiveRoles[0] !== nodeType) return false;
  for (const m of span.modifiers) {
    if (m.kind === 'optional' || m.kind === 'repeats' || m.kind === 'until' || m.kind === 'rawUntil' || m.kind === 'indent') {
      return false;
    }
  }
  return true;
}

function extractAlts(span: ResolvedSpan): ReadonlySet<string> | null {
  for (const ref of span.refinements) {
    if (ref.name !== 'alts') continue;
    const arr = ref.args?.[0];
    if (!Array.isArray(arr)) return null;
    const out = new Set<string>();
    for (const x of arr) {
      if (typeof x !== 'string') return null;
      out.add(x);
    }
    return out;
  }
  return null;
}

function collectCaptureRefs(body: RenderBody): Set<string> {
  const out = new Set<string>();
  walk(body, out);
  return out;
}

function walk(node: RenderBody, out: Set<string>): void {
  if (node === null) return;
  if (typeof node !== 'object') return;
  if (isStructureRef(node)) {
    const ref = node as StructureRef;
    if (ref.__ref === 'span-value' || ref.__ref === 'span-presence') {
      out.add(ref.name);
    }
    return;
  }
  if ((node as { __tpl?: unknown }).__tpl === true) {
    const slots = (node as { slots?: ReadonlyArray<{ ref: string }> }).slots ?? [];
    for (const s of slots) out.add(s.ref);
    return;
  }
  if ((node as { __dynKey?: unknown }).__dynKey === true) {
    const dk = node as unknown as { key: StructureRef; value: RenderBody };
    walk(dk.key as unknown as RenderBody, out);
    walk(dk.value, out);
    return;
  }
  if ((node as { __merge?: unknown }).__merge === true) {
    const m = node as unknown as { array: StructureRef };
    walk(m.array as unknown as RenderBody, out);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) walk(child, out);
    return;
  }
  for (const v of Object.values(node as Record<string, RenderBody>)) walk(v, out);
}
