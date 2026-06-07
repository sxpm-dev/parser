// Phase 5 foundation — binary-operator-production detection.
//
// Walks each NodeTypeInfo and identifies productions that match the
// canonical binary-operator shape:
//
//   [recursiveSpan(roleSelf), operatorSpan, recursiveSpan(roleSelf)]
//
// where:
//   - the first and last spans both recurse into the SAME node type (the
//     "self" role) — they are the left and right operands;
//   - the middle span is class `'operator'` — it captures any declared
//     operator literal at parse time.
//
// The body must reference all three captures so the inverse direction can
// reconstruct the tree. The detected binary production carries:
//   - the capture names for left, op, right (whatever the schema author
//     chose — `$.left`/`$.op`/`$.right` is the canonical convention but
//     not required);
//   - the production index within the node type's productions array, so
//     downstream Pratt emit can synthesize captures objects with the right
//     `__production` routing key.
//
// What this pass does NOT do:
//   - Validate that the operators referenced by `.operator()` match the
//     schema's declared layers (the operatorPrecedence map handles that).
//   - Emit code. The Pratt loop emission is the next sub-phase.
//   - Verify the round-trip property holds for the binary node. That's
//     the inverse emitter's job and lands alongside the forward Pratt.
//
// Domainless: nothing here knows about JS, CSS, or any specific language;
// detection runs purely on schema shape (closed-vocabulary classes and
// span roles).

import type { NodeTypeInfo, Production, ResolvedSpan } from '../model.ts';
import { isStructureRef } from '@parser2/parser';
import type { RenderBody, StructureRef } from '@parser2/parser';

export type BinaryProductionInfo = {
  readonly prodIdx: number;
  readonly leftCapture: string;
  readonly opCapture: string;
  readonly rightCapture: string;
};

// Result keyed by node type name. A node type can have at most one binary
// production — multiple binary alts on the same node type with different
// shapes are a schema-author error and rejected here (caller decides what
// to do with the diagnostic).
export type BinaryProductionMap = ReadonlyMap<string, BinaryProductionInfo>;

export function detectBinaryProductions(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): BinaryProductionMap {
  const out = new Map<string, BinaryProductionInfo>();
  for (const info of nodeTypes.values()) {
    let found: BinaryProductionInfo | undefined;
    for (let i = 0; i < info.productions.length; i++) {
      const candidate = matchBinaryProduction(info.name, info.productions[i]!, i);
      if (candidate === null) continue;
      if (found !== undefined) {
        // Two binary productions on the same node type. The compiler can't
        // pick a winner — schemas should use a single binary shape and
        // distinguish operators via the per-operator `.operator()` scanner
        // + precedence layers. Surface as a hard error so authoring drift
        // doesn't quietly produce ambiguous output.
        throw new Error(
          `binary-operator detection: node type '${info.name}' has more than one production matching the [recursive, operator, recursive] shape. Use a single binary production and declare operators via the schema's \`operators:\` map.`,
        );
      }
      found = candidate;
    }
    if (found !== undefined) out.set(info.name, found);
  }
  return out;
}

function matchBinaryProduction(
  nodeType: string,
  production: Production,
  prodIdx: number,
): BinaryProductionInfo | null {
  // Shape check — exactly three spans in [recursive, operator, recursive]
  // arrangement. Productions with more spans (e.g. binary with parens or
  // postfix punctuation around the operator) are not detected here; Phase
  // 5b can grow the shape vocabulary if needed.
  const spans = production.spans;
  if (spans.length !== 3) return null;
  const left = spans[0]!;
  const op = spans[1]!;
  const right = spans[2]!;

  if (!isSelfRecursive(left, nodeType)) return null;
  if (!isOperatorSpan(op)) return null;
  if (!isSelfRecursive(right, nodeType)) return null;
  if (left.name === undefined || op.name === undefined || right.name === undefined) {
    // All three captures must be named for the inverse direction to
    // populate them. An unnamed span has no capture key and would silently
    // drop the binary tree on round-trip.
    return null;
  }

  // Verify the AST body references all three captures via `$.<name>` refs
  // somewhere. The Pratt forward emit synthesizes a captures object with
  // those exact field names; if the body doesn't read them, the binary
  // shape is malformed.
  const astEntry = production.renders.get('ast');
  if (astEntry === undefined) {
    // No `ast` target means the schema isn't building an AST view of the
    // binary expression. We could still detect the shape and use it for
    // other targets, but the inverse direction needs SOME structured
    // target to round-trip through; defer until a schema needs it.
    return null;
  }
  const refs = collectCaptureRefs(astEntry.body);
  if (!refs.has(left.name) || !refs.has(op.name) || !refs.has(right.name)) {
    return null;
  }

  return { prodIdx, leftCapture: left.name, opCapture: op.name, rightCapture: right.name };
}

function isSelfRecursive(span: ResolvedSpan, nodeType: string): boolean {
  // The span must recurse exclusively into the same node type. Multi-role
  // spans (e.g. ['Rule', 'AtRule']) would make the Pratt loop ambiguous —
  // each operand would need a separate dispatcher. Defer those cases.
  if (span.recursiveRoles.length !== 1) return false;
  if (span.recursiveRoles[0] !== nodeType) return false;
  // No modifiers — the binary template's operands are mandatory, not
  // optional or repeating.
  for (const m of span.modifiers) {
    if (m.kind === 'optional' || m.kind === 'repeats' || m.kind === 'until' || m.kind === 'rawUntil' || m.kind === 'indent') {
      return false;
    }
  }
  return true;
}

function isOperatorSpan(span: ResolvedSpan): boolean {
  if (span.class !== 'operator') return false;
  if (span.recursiveRoles.length !== 0) return false;
  // No until/repeats — the operator captures a single token via the
  // `.operator()` class scanner.
  for (const m of span.modifiers) {
    if (m.kind === 'repeats' || m.kind === 'until' || m.kind === 'rawUntil') return false;
  }
  return true;
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
