// Inverse emit. For each (production, target) pair we emit:
//
//   function __invert_<NodeType>_<idx>_<target>(value): string
//     - Walks the production's `inverseDerived: InverseIR` and populates a
//       local `captures = {}` from the rendered value.
//     - Calls __rebuild_<NodeType>_<idx>(captures) to produce the canonical
//       source string.
//
// For each declared target we emit `__dispatchInverse_<target>(value)`:
//   - Object-valued targets dispatch on the body's literal field values
//     (precondition 2, "Inverse derivation" in the spec).
//   - String-valued (template) targets dispatch on the unique leading
//     literal prefix.
//   - Scalar / ref bodies are only legal as the sole production for a
//     target — discrimination collapses to the single case.
//   - Mismatches throw "stringify: no production matches".
//
// The runtime exposes `stringify(value, { type })`:
//   - Reads `__defaultTarget` when no `type` is provided.
//   - Throws "stringify: missing target" / "stringify: unknown target".
//   - Routes through `__inverseDispatch[target]`.
//
// Recursion: captures referencing recursive children land as nested
// rendered values (objects for object targets, fully-rebuilt strings for
// template targets). `__invertSlot_<target>` coerces a value to a
// source string by either returning it as-is (string) or routing through
// `__dispatchInverse_<target>(value)` (object).

import type {
  InferredSchema,
  InverseField,
  InverseIR,
  NodeTypeInfo,
  Production,
  RenderTargetIR,
} from '../model.ts';
import {
  INDENT_STEP_SPACES,
  isAbsentAllowed,
  joinOf,
  encodeOf,
  piecesToConcat,
  rebuildFnName,
  type Piece,
} from './rebuild.ts';
import { jsString } from './strings.ts';

// The indent step in spaces — kept in sync with emit/rebuild.ts.
// Used when emitting the `__indentCol + N` expression in slot helper calls
// for indent-modified spans.
const CODEGEN_INDENT_STEP = INDENT_STEP_SPACES;

// Phase 3 — when the caller supplies stringifyOverloads, they are emitted
// immediately before the public stringify implementation. Consumers see
// per-target value typing via TS overload resolution.
export type EmitInverseOptions = {
  readonly stringifyOverloads?: string;
};

export function emitInverse(schema: InferredSchema, options: EmitInverseOptions = {}): string {
  const targets = collectTargets(schema);
  const inverters: string[] = [];
  const dispatchers: string[] = [];
  const slotHelpers: string[] = [];

  // Feature 2: collect every (sorted-roles, target) pair used by any
  // multi-role recursive capture in the schema. We emit one
  // `__invertSlotMulti_<roles>_<target>` helper per pair, deduplicated
  // by the joined role names — so two schemas with the same role tuple
  // share the helper.
  const multiRoleCombos = collectMultiRoleCombos(schema, targets);
  // Same shape but for merge bodies — each merge IR needs a specialized
  // entry-dispatch helper that switches on the entry value's runtime type
  // (string → leaf-ref-shape role, object → dynKey/merge-shape role) and
  // calls one per-node dispatcher directly, avoiding the per-entry
  // try/catch chain the multi-role helper uses.
  const mergeCombos = collectMergeCombos(schema, targets);

  for (const target of targets) {
    for (const info of schema.nodeTypes.values()) {
      const binaryInfo = schema.binaryProductions.get(info.name);
      const unaryInfo = schema.unaryProductions.get(info.name);
      const passthroughIdxs = new Set(
        (schema.transparentPassthroughs.get(info.name) ?? []).map((p) => p.prodIdx),
      );
      for (let i = 0; i < info.productions.length; i++) {
        // Phase 5g: skip transparent-passthrough productions entirely.
        // Their AST body is a recursive ref to the same node type; the
        // inverse direction is handled by whichever inner production's
        // dispatcher actually claims the value, so no inverter is
        // needed for this wrapper.
        if (passthroughIdxs.has(i)) continue;
        const production = info.productions[i]!;
        const entry = production.renders.get(target);
        if (!entry) {
          throw new Error(`inverse: production '${info.name}#${i}' missing target '${target}'`);
        }
        // Tolerated productions (see infer/invert.ts) have no
        // inverseDerived. Skip their inverter emit; the canonical
        // (first declared) production's inverter handles all values
        // of this shape via the node dispatcher.
        if (entry.inverseDerived === undefined) continue;
        // Phase 5c: when this is the binary production of a Pratt-detected
        // node type AND we're emitting the 'ast' target's inverter, emit
        // a paren-aware variant that wraps the rebuilt source when the
        // node's precedence is looser than the calling context expects.
        // Other targets and other productions use the standard inverter.
        if (binaryInfo !== undefined && i === binaryInfo.prodIdx && target === 'ast') {
          inverters.push(emitPrattBinaryInverter(info.name, i, target, production, binaryInfo, schema));
        } else if (unaryInfo !== undefined && i === unaryInfo.prodIdx && target === 'ast') {
          // Phase 5g: unary's operand needs paren wrapping when it's a
          // binary node — unary binds tighter than any binary op, so the
          // operand minPrec is effectively "highest" (one past the
          // tightest declared layer).
          inverters.push(emitPrattUnaryInverter(info.name, i, target, production, unaryInfo, schema));
        } else {
          inverters.push(emitInverter(info.name, i, target, entry, production));
        }
      }
    }
    // Gap C: per-(NodeType, target) dispatchers. The PUBLIC stringify routes
    // through `__dispatchInverse_<rootType>_<target>` only — sub-productions
    // are reachable only via recursive child capture sites that dispatch on
    // the statically-known child node type. This prevents a sub-production's
    // template prefix (e.g. `*` for a CronField wildcard) from accidentally
    // matching a root-level rendered value that starts the same way.
    //
    // Phase 5c: when a node type has a Pratt-detected binary production AND
    // we're emitting the 'ast' target dispatcher, the dispatcher accepts an
    // additional `__minPrec` parameter and forwards it to the binary
    // inverter. Other inverters ignore it. The slot helper for the same
    // node type also accepts the parameter and forwards it to the
    // dispatcher.
    for (const info of schema.nodeTypes.values()) {
      const binaryInfo = schema.binaryProductions.get(info.name);
      const isPrattAst = binaryInfo !== undefined && target === 'ast';
      dispatchers.push(emitNodeDispatcher(info, target, isPrattAst ? binaryInfo : undefined));
      slotHelpers.push(emitNodeSlotHelper(info.name, target, isPrattAst));
    }
    // Feature 2: per-target multi-role slot helpers. Each helper tries
    // every role's per-(NodeType, target) dispatcher in order, returning
    // the first whose discriminator matches. Built on top of the
    // single-role per-node dispatchers established by Gap C — see
    // `emitMultiRoleSlotHelper` for the routing logic.
    for (const roles of multiRoleCombos.get(target) ?? []) {
      slotHelpers.push(emitMultiRoleSlotHelper(roles, target));
    }
    for (const roles of mergeCombos.get(target) ?? []) {
      slotHelpers.push(emitMergeSlotHelper(roles, target, schema));
    }
    // Generic leaf slot helper (per target) for non-recursive captures.
    // Non-recursive captures are primitives or arrays of primitives — no
    // dispatching needed; the helper just unboxes shapes for rebuild.
    slotHelpers.push(emitLeafSlotHelper(target));
    // Root entry-point dispatcher used by the public stringify table.
    dispatchers.push(emitRootDispatcher(schema.rootType, target));
  }

  const dispatchTable = emitDispatchTable(targets);
  const publicStringify = emitPublicStringify(options.stringifyOverloads ?? '', schema.whitespace === 'preserve');

  return [
    inverters.join('\n\n'),
    dispatchers.join('\n\n'),
    slotHelpers.join('\n\n'),
    dispatchTable,
    publicStringify,
  ].filter((p) => p !== '').join('\n\n');
}

// ---------------------------------------------------------------------------
// Inverter emit per (production, target)
// ---------------------------------------------------------------------------

function emitInverter(
  nodeName: string,
  prodIdx: number,
  target: string,
  entry: RenderTargetIR,
  production: Production,
): string {
  const fnName = inverterName(nodeName, prodIdx, target);
  const ir = entry.inverseDerived;
  if (!ir) {
    throw new Error(`inverse: missing inverseDerived for '${nodeName}#${prodIdx}' target '${target}'`);
  }
  // Scalar bodies recover no captures — the production has no free slots in
  // this target. The rebuild subroutine needs captures to interleave the
  // spans, so for scalar-bodied inverses we just assert equality and return
  // the example source verbatim (it IS the canonical form because every
  // span value is constant).
  if (ir.kind === 'scalar') {
    const assertion = emitScalarAssertion(ir.value, 'value');
    return `function ${fnName}(value: any, __indentCol: number = 0): string {
${indent(assertion, 1)}
  return ${jsString(production.source.input)};
}`;
  }
  const body = emitInverseBody(ir, 'value', target, production);
  // Task #18: stringify always produces SOURCE, regardless of which target's
  // value was passed in. The canonical source for a production is the
  // production's source-target body. When that body is a Template the
  // shared span-driven rebuild (`__rebuild_<Node>_<idx>`) can lose
  // information — e.g. CSS Comment's `tpl`/* ${$.text} */`` body wraps the
  // interior with `/* */` literals that `.comment()` already stripped at
  // parse time, so the span-driven rebuild emits only `captures.text`
  // ('foo'), not '/* foo */'. The template-driven rebuild interleaves the
  // template's literal segments with the captures populated from THIS
  // target's body, producing canonical source from any target's
  // perspective.
  //
  // When the source target body is NOT a template (object/dynKey/merge/
  // ref/scalar), or no source target exists, fall back to the shared
  // span-driven rebuild — those bodies don't carry framing literals the
  // spans don't already describe.
  const sourceEntry = production.renders.get('source');
  const sourceIr = sourceEntry?.inverseDerived;
  if (sourceIr && sourceIr.kind === 'template') {
    const expr = emitTemplateRebuildExpr(sourceIr, production);
    return `function ${fnName}(value: any, __indentCol: number = 0): string {
  const captures: any = {};
${indent(body, 1)}
  return ${expr};
}`;
  }
  const rebuild = rebuildFnName(nodeName, prodIdx);
  return `function ${fnName}(value: any, __indentCol: number = 0): string {
  const captures: any = {};
${indent(body, 1)}
  return ${rebuild}(captures, __indentCol);
}`;
}

// Phase 5c — paren-aware inverter for the Pratt-detected binary production.
// Replaces the standard captures-walk + rebuild path with a custom one that:
//   1. Reads value.<leftCapture>, value.<opCapture>, value.<rightCapture>
//      directly off the AST node — Pratt's forward emit guarantees these
//      fields exist on every binary node.
//   2. Looks up the parent op's precedence in __precTable (the same table
//      emitted by Pratt forward) and uses it to recurse with the correct
//      `__minPrec` on each child — own_prec for the left side, own_prec + 1
//      for the right side (left-associative convention).
//   3. Concatenates the rebuilt left + " " + op + " " + right.
//   4. Wraps the result in parens when `myPrec < __minPrec` — i.e. when
//      the caller's context requires a tighter binding than this node
//      itself binds.
//
// The slot helper for this node type accepts `__minPrec` and forwards it
// to the dispatcher; the dispatcher forwards it to THIS inverter only.
// Other inverters in the same node type (the primaries) ignore the
// parameter.
//
// Limitation: assumes left-associative operators. A future
// right-associative annotation on `operators:` layers would swap the
// rules (own_prec + 1 on the left, own_prec on the right).
function emitPrattBinaryInverter(
  nodeName: string,
  prodIdx: number,
  target: string,
  production: Production,
  binaryInfo: import('../infer/binary-operators.ts').BinaryProductionInfo,
  schema: InferredSchema,
): string {
  const fnName = inverterName(nodeName, prodIdx, target);
  const slotHelper = nodeSlotHelperName(nodeName, target);
  // Build the per-op precedence table as a `const` map. Mirrors the table
  // the Pratt forward emit bakes; computed afresh here so the inverse
  // module stays self-contained.
  // Pure-unary operators (declared only on a unary production via
  // `.operator([...])`) carry no binary precedence. Inverse needs only
  // the binary ones — the wrap rule uses precedence comparison.
  const precEntries = schema.operatorLiterals
    .filter((op) => schema.operatorPrecedence.has(op))
    .map((op) => `    ${jsString(op)}: ${schema.operatorPrecedence.get(op)},`)
    .join('\n');
  // Phase 5e: right-assoc map. The paren rules swap when the OUTER op is
  // right-associative: equal-precedence child on the LEFT side now gets
  // parens (forced left-grouping), equal-precedence child on the RIGHT
  // doesn't (natural right-grouping). Mirrors the forward Pratt's
  // `nextMinPrec` swap.
  const rightAssocEntries = schema.operatorLiterals
    .filter((op) => schema.rightAssociativeOps.has(op))
    .map((op) => `    ${jsString(op)}: true,`)
    .join('\n');
  const rightAssocBlock = rightAssocEntries.length === 0
    ? '{}'
    : `{\n${rightAssocEntries}\n  }`;
  // Span literal joins between left/op and op/right come from the
  // production's spans — for js-expr the schema example is `'a + b'`
  // (single-space separators), so the rebuild uses ' ' on each side. We
  // bake that join here by reading the production's source input directly:
  // the separators are whatever literal substring sits between the
  // captured operand text and the operator text. For the canonical
  // `'<left> <op> <right>'` shape that's a single space on each side; a
  // more general implementation would walk the production's spans and
  // collect the literal gaps.
  const { leftJoin, rightJoin } = computeBinarySeparators(production, binaryInfo);
  const left = binaryInfo.leftCapture;
  const op = binaryInfo.opCapture;
  const right = binaryInfo.rightCapture;
  return `function ${fnName}(value: any, __indentCol: number = 0, __minPrec: number = -1): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error("stringify: expected binary expression object for '${nodeName}', got " + typeof value);
  }
  const __op = value${memberAccess(op)};
  if (typeof __op !== 'string') {
    throw new Error("stringify: binary '${nodeName}' missing string op (got " + typeof __op + ")");
  }
  const __precTable: Record<string, number> = {
${precEntries}
  };
  const __rightAssoc: Record<string, boolean> = ${rightAssocBlock};
  const __myPrec = __precTable[__op];
  if (__myPrec === undefined) {
    throw new Error("stringify: binary '${nodeName}' op '" + __op + "' not declared in operators map");
  }
  // Left-assoc: left=myPrec, right=myPrec+1. Right-assoc: left=myPrec+1,
  // right=myPrec. Wrap rule \`myPrec < minPrec\` stays the same; only
  // what we PASS as minPrec to the children swaps.
  const __leftMinPrec = __rightAssoc[__op] ? __myPrec + 1 : __myPrec;
  const __rightMinPrec = __rightAssoc[__op] ? __myPrec : __myPrec + 1;
  const __leftStr = ${slotHelper}(value${memberAccess(left)}, __indentCol, __leftMinPrec);
  const __rightStr = ${slotHelper}(value${memberAccess(right)}, __indentCol, __rightMinPrec);
  let __result = String(__leftStr) + ${jsString(leftJoin)} + __op + ${jsString(rightJoin)} + String(__rightStr);
  if (__myPrec < __minPrec) __result = "(" + __result + ")";
  return __result;
}`;
}

// Phase 5g — paren-aware unary inverter. Unary binds tighter than any
// declared binary precedence layer, so the operand is wrapped in parens
// when it's a binary node at any layer. We achieve this by passing a
// minPrec of `numLayers` (one past the tightest layer index) into the
// operand slot helper — every binary op's myPrec is < numLayers, so the
// binary wrap test fires.
function emitPrattUnaryInverter(
  nodeName: string,
  prodIdx: number,
  target: string,
  production: Production,
  unaryInfo: import('../infer/unary-operators.ts').UnaryProductionInfo,
  schema: InferredSchema,
): string {
  const fnName = inverterName(nodeName, prodIdx, target);
  const slotHelper = nodeSlotHelperName(nodeName, target);
  // numLayers = max precedence index + 1. Any declared binary op has
  // prec < numLayers, so passing numLayers as the operand minPrec
  // triggers the wrap rule `myPrec < minPrec` for every binary node.
  let numLayers = 0;
  for (const p of schema.operatorPrecedence.values()) {
    if (p + 1 > numLayers) numLayers = p + 1;
  }
  const op = unaryInfo.opCapture;
  const operand = unaryInfo.operandCapture;
  // Literal join between op and operand — derive the same way the
  // binary helper does, then canonicalize whitespace runs to a single
  // space (or empty for adjacent literals like `!a`).
  const opJoin = computeUnarySeparator(production, unaryInfo);
  return `function ${fnName}(value: any, __indentCol: number = 0): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error("stringify: expected unary expression object for '${nodeName}', got " + typeof value);
  }
  const __op = value${memberAccess(op)};
  if (typeof __op !== 'string') {
    throw new Error("stringify: unary '${nodeName}' missing string op (got " + typeof __op + ")");
  }
  const __operandStr = ${slotHelper}(value${memberAccess(operand)}, __indentCol, ${numLayers});
  return __op + ${jsString(opJoin)} + String(__operandStr);
}`;
}

function computeUnarySeparator(
  production: Production,
  unaryInfo: import('../infer/unary-operators.ts').UnaryProductionInfo,
): string {
  const src = production.source.input;
  const opSpan = production.spans.find((s) => s.name === unaryInfo.opCapture);
  const operandSpan = production.spans.find((s) => s.name === unaryInfo.operandCapture);
  if (!opSpan || !operandSpan || opSpan.text === undefined || operandSpan.text === undefined) {
    return '';
  }
  const opStart = src.indexOf(opSpan.text);
  if (opStart < 0) return '';
  const opEnd = opStart + opSpan.text.length;
  const operandStart = src.indexOf(operandSpan.text, opEnd);
  if (operandStart < 0) return '';
  const between = src.slice(opEnd, operandStart);
  return between.length === 0 ? '' : ' ';
}

// Derive the literal join strings between (left, op) and (op, right) for a
// binary production. For the canonical `[left, op, right]` example with
// standard whitespace policy, both joins are a single space — but the
// example's input may use a different layout, and the inverse must reflect
// what the rebuild would naturally produce. Strategy: slice the production's
// source input between span text ranges.
function computeBinarySeparators(
  production: Production,
  binaryInfo: import('../infer/binary-operators.ts').BinaryProductionInfo,
): { readonly leftJoin: string; readonly rightJoin: string } {
  const src = production.source.input;
  const leftSpan = production.spans.find((s) => s.name === binaryInfo.leftCapture);
  const opSpan = production.spans.find((s) => s.name === binaryInfo.opCapture);
  const rightSpan = production.spans.find((s) => s.name === binaryInfo.rightCapture);
  // Locate each span's text inside the input. The shape is fixed by
  // detection: three spans in this order. Resolve left-to-right with a
  // cursor.
  let cursor = 0;
  const findFrom = (text: string | undefined): { start: number; end: number } => {
    if (text === undefined) return { start: cursor, end: cursor };
    const start = src.indexOf(text, cursor);
    if (start < 0) return { start: cursor, end: cursor };
    cursor = start + text.length;
    return { start, end: cursor };
  };
  const l = findFrom(leftSpan?.text);
  const o = findFrom(opSpan?.text);
  const r = findFrom(rightSpan?.text);
  const leftJoin = src.slice(l.end, o.start);
  const rightJoin = src.slice(o.end, r.start);
  // Canonicalize: collapse any whitespace run to a single ' '. The forward
  // Pratt loop skips whitespace on both sides of the operator scan, so the
  // exact whitespace shape in the example doesn't survive parse — using
  // the canonical single space keeps round-trip value-stable.
  return {
    leftJoin: leftJoin.length === 0 ? '' : ' ',
    rightJoin: rightJoin.length === 0 ? '' : ' ',
  };
}

// Build a JS expression that reconstructs the canonical source for a
// template-bodied target by interleaving the IR's literal segments with
// the captures populated by `emitTemplateBody`. Each capture's run-time
// shape is determined by the corresponding span's modifiers/refinements
// — we reuse `Piece` + `piecesToConcat` from rebuild.ts so optional
// fusion, repeats joins, indent join, and JSON re-encoding all behave
// identically to the span-driven rebuild path.
function emitTemplateRebuildExpr(
  ir: Extract<InverseIR, { kind: 'template' }>,
  production: Production,
): string {
  const pieces: Piece[] = [];
  for (let i = 0; i < ir.captures.length; i++) {
    const seg = ir.segments[i] ?? '';
    if (seg.length > 0) {
      pieces.push({ kind: 'literal', text: seg });
    }
    const ref = ir.captures[i]!;
    const span = production.spans.find((s) => s.name === ref);
    const optional = span !== undefined && isAbsentAllowed(span);
    const join = span !== undefined ? joinOf(span) : { kind: 'none' as const };
    const encode = span !== undefined ? encodeOf(span) : ('none' as const);
    pieces.push({ kind: 'slot', ref, optional, join, encode });
  }
  const lastSeg = ir.segments[ir.segments.length - 1] ?? '';
  if (lastSeg.length > 0) {
    pieces.push({ kind: 'literal', text: lastSeg });
  }
  return piecesToConcat(pieces);
}

// Returns JS statements (one per line, no leading indent) that read from the
// given `value` expression into the in-scope `captures` object.
//
// Gap C: capture sites resolve the slot helper per (child node type,
// target). The child node type for each capture is looked up on the
// owning production's spans (`recursiveRoles[0]`). Non-recursive
// captures use a target-scoped no-dispatch helper that just unboxes the
// already-source-shaped value.
function emitInverseBody(
  ir: InverseIR,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  switch (ir.kind) {
    case 'object':
      return emitObjectBody(ir.fields, valueExpr, target, production);
    case 'array':
      return emitArrayBody(ir.elements, valueExpr, target, production);
    case 'scalar':
      return emitScalarAssertion(ir.value, valueExpr);
    case 'ref': {
      // For source-target ref bodies whose capture span is .string().coerce(),
      // the inbound value IS the encoded source slice (e.g. `"hello"`); we
      // decode here so the shared rebuild's encoder round-trips cleanly
      // (encode(decode(x)) === x for valid encodings). For all other cases
      // the slot helper handles dispatch and pass-through.
      const refSpan = production.spans.find((s) => s.name === ir.capture);
      if (
        refSpan &&
        target === 'source' &&
        refSpan.class === 'string' &&
        refSpan.refinements.some((r) => r.name === 'coerce')
      ) {
        return `captures${memberAccess(ir.capture)} = decodeJsonString(${valueExpr});`;
      }
      return `captures${memberAccess(ir.capture)} = ${slotHelperCall(ir.capture, production, target, valueExpr)};`;
    }
    case 'template':
      return emitTemplateBody(ir.segments, ir.captures, valueExpr, target, production);
    case 'dynKey':
      return emitDynKeyBody(ir.keyCapture, ir.value, valueExpr, target, production);
    case 'merge':
      return emitMergeBody(ir.arrayCapture, valueExpr, target, production);
    case 'presence': {
      // Span-presence inverse: `valueExpr` is a boolean. Set
      // captures[name] to the literal text on true (for literal-only
      // optional spans whose text we baked in at derivation time), or
      // null on false / non-literal optionals. The rebuild's optional-
      // slot emit consults captures[name] to decide whether to emit;
      // null means absent — matching the value-stable contract.
      const lit = ir.literalText !== undefined ? JSON.stringify(ir.literalText) : 'null';
      return `captures${memberAccess(ir.capture)} = (${valueExpr}) ? ${lit} : null;`;
    }
  }
}

/**
 * Emit the inverse for `dynKey($.<keyCapture>, value)`: assert the input is
 * a single-entry object, bind the key string into captures[keyCapture], then
 * recurse on the entry value via the value sub-IR.
 *
 * Throws on shape mismatch — that's what makes multi-role dispatch work: a
 * dynKey-bodied production whose value-IR expects a string will throw when
 * given an object entry value, letting the next role's dispatcher try.
 */
function emitDynKeyBody(
  keyCapture: string,
  valueIR: InverseIR,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  // Recurse on a fresh local — the value sub-IR operates on the entry's value,
  // not on the wrapping object.
  const inner = emitInverseBody(valueIR, '__dkVal', target, production);
  return [
    `if (${valueExpr} === null || typeof ${valueExpr} !== "object" || Array.isArray(${valueExpr})) {`,
    `  throw new Error("stringify: expected single-entry object for dynKey '${keyCapture}', got " + typeof ${valueExpr});`,
    `}`,
    `{`,
    `  const __dkKeys = Object.keys(${valueExpr});`,
    `  if (__dkKeys.length !== 1) {`,
    `    throw new Error("stringify: expected single-entry object for dynKey '${keyCapture}', got " + __dkKeys.length + " keys");`,
    `  }`,
    `  const __dkKey = __dkKeys[0]!;`,
    `  const __dkVal = (${valueExpr} as Record<string, unknown>)[__dkKey];`,
    `  captures${memberAccess(keyCapture)} = __dkKey;`,
    inner,
    `}`,
  ].join('\n');
}

/**
 * Emit the inverse for `merge($.<arrayCapture>)`: iterate the input
 * object's entries, wrap each as `{[k]: v}`, and dispatch through the
 * recursive role's per-node inverter (or multi-role helper for unions).
 * Each call returns a source string; collect them into the captures
 * array. The receiving span's rebuild walks this array.
 */
function emitMergeBody(
  arrayCapture: string,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  const span = production.spans.find((s) => s.name === arrayCapture);
  if (!span || span.recursiveRoles.length === 0) {
    throw new Error(
      `inverse: merge('${arrayCapture}') on '${production.nodeType}' must reference a recursive repeats span (got ${span ? 'non-recursive' : 'unknown span'})`,
    );
  }
  const roles = span.recursiveRoles;
  // For the merge case we always go through the specialized merge slot
  // helper (emitted by emitMergeSlotHelper). It pre-classifies each role's
  // productions by entry-value-type bucket and dispatches directly without
  // the per-entry try/catch the generic multi-role helper uses. For huge
  // inputs the saving is on the order of 5×: a 1000-row CSS file with
  // ~9000 entries × 4 roles in the multi-role helper costs ~36K thrown
  // exceptions; the specialized helper makes one direct call per entry.
  const helper = mergeSlotHelperName(roles, target);
  return [
    `if (${valueExpr} === null || typeof ${valueExpr} !== "object" || Array.isArray(${valueExpr})) {`,
    `  throw new Error("stringify: expected object for merge '${arrayCapture}', got " + typeof ${valueExpr});`,
    `}`,
    `{`,
    `  const __mEntries = Object.entries(${valueExpr} as Record<string, unknown>);`,
    `  const __mArr: any[] = [];`,
    `  for (let __mI = 0; __mI < __mEntries.length; __mI++) {`,
    `    const __mK = __mEntries[__mI]![0];`,
    `    const __mV = __mEntries[__mI]![1];`,
    `    const __mWrapped: any = { [__mK]: __mV };`,
    `    __mArr.push(${helper}(__mWrapped, __mV, __indentCol));`,
    `  }`,
    `  captures${memberAccess(arrayCapture)} = __mArr;`,
    `}`,
  ].join('\n');
}

function mergeSlotHelperName(roles: ReadonlyArray<string>, target: string): string {
  return `__invertMergeEntry_${roles.map(jsIdent).join('_')}_${jsIdent(target)}`;
}

/**
 * Emit a merge slot helper for a given (roles, target). The helper takes a
 * single wrapped entry (`{[k]: v}`) AND a hoisted reference to the entry
 * value (`v`) so it can switch directly on `typeof v` without re-indexing,
 * then dispatches to whichever role's per-node dispatcher handles that
 * value-type bucket.
 *
 * Bucket assignment is by inspecting each role's productions' inverse-IR:
 *   - dynKey body with `value.kind === 'ref'` → string bucket (entry value
 *     is the leaf-captured string)
 *   - dynKey body with `value.kind ∈ {merge, dynKey, object}` → object
 *     bucket
 *   - dynKey body with `value.kind === 'array'` → array bucket
 *   - non-dynKey productions (template, plain object, etc.) → "any" bucket;
 *     we still try them, but they're after the type-matched ones
 *   - scalar-null bodies → skipped (production opted out of this target)
 */
function emitMergeSlotHelper(
  roles: ReadonlyArray<string>,
  target: string,
  schema: InferredSchema,
): string {
  const helperName = mergeSlotHelperName(roles, target);
  // Buckets keyed by entry-value type → ordered list of (role, prodIdx)
  // entries. Order within a bucket follows role-declaration order + then
  // production index, matching the existing multi-role helper convention.
  const stringBucket: string[] = [];
  const objectBucket: string[] = [];
  const arrayBucket: string[] = [];
  const anyBucket: string[] = [];
  for (const role of roles) {
    const info = schema.nodeTypes.get(role);
    if (!info) continue;
    for (let i = 0; i < info.productions.length; i++) {
      const production = info.productions[i]!;
      const entry = production.renders.get(target);
      const ir = entry?.inverseDerived;
      if (!ir) continue;
      if (ir.kind === 'scalar' && ir.value === null) continue;
      // For dynKey-with-ref bodies whose ref capture is a recursive
      // `.of(...)` span, the entry value can be any shape (the recursive
      // role chain produces scalars, objects, arrays, etc.). Force such
      // productions into the 'any' bucket so every entry-value type is
      // tried, not just strings.
      let bucket = bucketForIR(ir);
      if (bucket === 'string' && ir.kind === 'dynKey' && ir.value.kind === 'ref') {
        const refSpan = production.spans.find((s) => s.name === (ir.value as { capture: string }).capture);
        if (refSpan && refSpan.recursiveRoles.length > 0) {
          bucket = 'any';
        }
      }
      const call = `${nodeDispatcherName(role, target)}(__mWrapped, __indentCol)`;
      switch (bucket) {
        case 'string': stringBucket.push(call); break;
        case 'object': objectBucket.push(call); break;
        case 'array': arrayBucket.push(call); break;
        case 'any': anyBucket.push(call); break;
      }
    }
  }
  // Each bucket emits a sequence of probes. If only one production is in a
  // bucket we call it directly; multiple productions in the same bucket
  // fall back to a small try/catch chain (still much smaller than the
  // generic 1-of-N multi-role chain).
  const branchFor = (calls: ReadonlyArray<string>): string => {
    if (calls.length === 0) {
      return `  throw new Error("stringify: no production matches merge entry");`;
    }
    if (calls.length === 1) return `  return ${calls[0]};`;
    const lines: string[] = [];
    for (let i = 0; i < calls.length - 1; i++) {
      lines.push(`  try { return ${calls[i]}; } catch (_e) { /* try next */ }`);
    }
    lines.push(`  return ${calls[calls.length - 1]};`);
    return lines.join('\n');
  };
  const lines: string[] = [];
  lines.push(`function ${helperName}(__mWrapped: any, __mV: any, __indentCol: number = 0): string {`);
  if (stringBucket.length > 0) {
    lines.push(`  if (typeof __mV === "string") {`);
    lines.push(branchFor(stringBucket));
    lines.push(`  }`);
  }
  if (objectBucket.length > 0) {
    lines.push(`  if (__mV !== null && typeof __mV === "object" && !Array.isArray(__mV)) {`);
    lines.push(branchFor(objectBucket));
    lines.push(`  }`);
  }
  if (arrayBucket.length > 0) {
    lines.push(`  if (Array.isArray(__mV)) {`);
    lines.push(branchFor(arrayBucket));
    lines.push(`  }`);
  }
  if (anyBucket.length > 0) {
    // Wildcard productions — try after specific buckets.
    lines.push(branchFor(anyBucket));
  } else {
    lines.push(`  throw new Error("stringify: merge entry value type not handled by any production (${roles.join(', ')}; entry value type: " + typeof __mV + ")");`);
  }
  lines.push(`}`);
  return lines.join('\n');
}

// Compute the dispatcher's accept condition for a set of bare-ref branches.
// The condition expresses what JS value shapes the ref's capture span can
// produce. Returns the literal string 'always' to denote unconditional
// acceptance (emitter then drops the guard entirely).
function refsAcceptCondition(
  productions: ReadonlyArray<Production>,
  refs: ReadonlyArray<{ readonly prodIdx: number; readonly ir: InverseIR; readonly target: string }>,
): string {
  // Track which JS shapes are admissible across all ref branches in this
  // dispatcher. Defaulting to 'no shape allowed' and unioning each branch's
  // shapes preserves "must be all of {a, b}" if every branch agrees.
  let acceptsNull = false;
  let acceptsString = false;
  let acceptsNumber = false;
  let acceptsBoolean = false;
  let acceptsArray = false;
  let acceptsObject = false;
  // True iff every string-accepting branch requires a JSON-quote prefix
  // (`"` or `'`). Set when a `.string().coerce()` span owns the source
  // target — a bare keyword like `null` shouldn't dispatch to it.
  let stringNeedsJsonQuotePrefix = true;
  for (const b of refs) {
    if (b.ir.kind !== 'ref') continue;
    const refIR = b.ir;
    const prod = productions[b.prodIdx]!;
    const span = prod.spans.find((s) => s.name === refIR.capture);
    if (!span) {
      // Couldn't resolve — admit everything (conservative).
      return 'value !== undefined';
    }
    const hasRepeats = span.modifiers.some((m) => m.kind === 'repeats');
    const hasOptional = span.modifiers.some((m) => m.kind === 'optional');
    const isRecursive = span.recursiveRoles.length > 0;
    if (hasRepeats) {
      acceptsArray = true;
    } else if (isRecursive) {
      // Multi-role recursive span — could yield any shape (scalar, object,
      // array, etc.) depending on which role matched. Admit anything.
      return 'value !== undefined';
    } else {
      // Classed scalar capture (.string(), .number(), .until(), .ident(), …).
      // Use the class to narrow further. For .number()/.string() with
      // .coerce(), the AST target receives the coerced JS value (number /
      // decoded string) while the source target receives the source slice
      // (still a string for both, but quote-prefixed when string-coerce
      // is used).
      const hasCoerce = span.refinements.some((r) => r.name === 'coerce');
      switch (span.class) {
        case 'ident':
        case 'literal':
        case 'hex':
        case 'comment':
        case 'operator':
          acceptsString = true;
          stringNeedsJsonQuotePrefix = false;
          break;
        case 'string':
          acceptsString = true;
          // Only retain the quote-prefix tightening if EVERY string-
          // accepting branch is a string-coerce-source case. A single
          // non-coerce ref clears it.
          if (!(hasCoerce && b.target === 'source')) {
            stringNeedsJsonQuotePrefix = false;
          }
          break;
        case 'number':
          if (hasCoerce && b.target === 'ast') {
            acceptsNumber = true;
          } else {
            // .number() with no coerce, or source target: captured value
            // is a string slice.
            acceptsString = true;
            stringNeedsJsonQuotePrefix = false;
          }
          break;
        default:
          // Unknown class — be conservative.
          return 'value !== undefined';
      }
    }
    if (hasOptional) acceptsNull = true;
  }
  const parts: string[] = [];
  if (acceptsNull) parts.push('value === null');
  if (acceptsString) {
    if (stringNeedsJsonQuotePrefix) {
      parts.push('(typeof value === "string" && value.length >= 2 && (value.charCodeAt(0) === 0x22 || value.charCodeAt(0) === 0x27))');
    } else {
      parts.push('typeof value === "string"');
    }
  }
  if (acceptsNumber) parts.push('typeof value === "number"');
  if (acceptsBoolean) parts.push('typeof value === "boolean"');
  if (acceptsArray) parts.push('Array.isArray(value)');
  if (acceptsObject) parts.push('(typeof value === "object" && value !== null && !Array.isArray(value))');
  if (parts.length === 0) return 'value !== undefined';
  return parts.join(' || ');
}

function bucketForIR(ir: InverseIR): 'string' | 'object' | 'array' | 'any' {
  if (ir.kind !== 'dynKey') return 'any';
  switch (ir.value.kind) {
    case 'ref': return 'string';
    case 'merge':
    case 'dynKey':
    case 'object': return 'object';
    case 'array': return 'array';
    case 'scalar':
    case 'template':
    case 'presence':
      return 'any';
  }
}

function emitObjectBody(
  fields: ReadonlyArray<InverseField>,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  const lines: string[] = [];
  lines.push(
    `if (${valueExpr} === null || typeof ${valueExpr} !== "object" || Array.isArray(${valueExpr})) {`,
    `  throw new Error("stringify: expected object value, got " + typeof ${valueExpr});`,
    `}`,
  );
  for (const field of fields) {
    const access = `${valueExpr}${memberAccess(field.name)}`;
    if (field.kind === 'literal') {
      const litJs = jsLiteral(field.value);
      lines.push(
        `if (!Object.is(${access}, ${litJs})) {`,
        `  throw new Error("stringify: field ${escapeForError(JSON.stringify(field.name))} expected ${escapeForError(litJs)}, got " + JSON.stringify(${access}));`,
        `}`,
      );
      // Hardcoded-literal-in-AST round-trip: when the field name matches
      // a named span in the production AND the literal value is a string,
      // also populate captures[name] so the shared rebuild can emit the
      // span's text. Without this, schemas that hardcode a literal in
      // the AST instead of routing it through $.name lose the value on
      // stringify (rebuild reads undefined → empty slot).
      if (typeof field.value === 'string' && productionHasNamedSpan(production, field.name)) {
        lines.push(`captures${memberAccess(field.name)} = ${litJs};`);
      }
    } else {
      lines.push(...emitInverseBody(field.inverse, access, target, production).split('\n'));
    }
  }
  return lines.join('\n');
}

function productionHasNamedSpan(production: Production, name: string): boolean {
  for (const span of production.spans) {
    if (span.name === name) return true;
  }
  return false;
}

function emitArrayBody(
  elements: ReadonlyArray<InverseIR>,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  const lines: string[] = [];
  lines.push(
    `if (!Array.isArray(${valueExpr}) || ${valueExpr}.length !== ${elements.length}) {`,
    `  throw new Error("stringify: expected array of length ${elements.length}, got " + (Array.isArray(${valueExpr}) ? ("length " + ${valueExpr}.length) : typeof ${valueExpr}));`,
    `}`,
  );
  for (let i = 0; i < elements.length; i++) {
    lines.push(...emitInverseBody(elements[i]!, `${valueExpr}[${i}]`, target, production).split('\n'));
  }
  return lines.join('\n');
}

// Lookup whether a named capture on the given production references an
// optional (.optional() or .repeats({min:0})) span. Used by the inverse
// template scanner so the tail-optional-absent path mirrors Gap A's
// forward fusion.
function isOptionalCapture(production: Production, captureName: string): boolean {
  for (const span of production.spans) {
    if (span.name !== captureName) continue;
    for (const m of span.modifiers) {
      if (m.kind === 'optional') return true;
      if (m.kind === 'repeats' && (m.min === undefined || m.min === 0)) return true;
    }
    return false;
  }
  return false;
}

// Resolve the slot-helper call for a capture site. Looks up the capture's
// span on the owning production. If the span is recursive (single child
// role — Gap C v1 constraint), call the per-(child-node-type, target)
// helper so the recursive dispatcher is scoped to the child node's
// productions only. Otherwise the captured value is a leaf (string or
// array of strings) and we route through the generic per-target slot
// helper that just unboxes.
//
// `indentColExpr` is a JS expression (typically `"__indentCol"` or a
// literal like `"0"`) representing the current indent column. For indent-
// modified spans the child column is `indentColExpr + CODEGEN_INDENT_STEP`;
// for other spans it is passed through unchanged. Leaf helpers ignore it.
function slotHelperCall(
  capture: string,
  production: Production,
  target: string,
  valueExpr: string,
  indentColExpr = '__indentCol',
): string {
  for (const span of production.spans) {
    if (span.name !== capture) continue;
    // For source-target captures whose span is `.string().coerce()` the
    // inbound slice is encoded (`"…"` or `'…'`). Decode here so the
    // shared rebuild's encoder round-trips cleanly. Mirrors the
    // ref-body case in emitInverseBody.
    if (
      target === 'source' &&
      span.class === 'string' &&
      span.refinements.some((r) => r.name === 'coerce')
    ) {
      return `decodeJsonString(${valueExpr})`;
    }
    const roles = span.recursiveRoles;
    if (roles.length === 0) {
      // Non-recursive capture — primitive or repeated primitive. The
      // generic helper handles null/string/array pass-through without
      // dispatching to any per-node inverter.
      return `__invertSlotLeaf_${jsIdent(target)}(${valueExpr})`;
    }
    // Indent-modified spans add CODEGEN_INDENT_STEP to the column so child
    // nodes receive the column at which THEIR indent children will live.
    // Non-indent spans pass the column through unchanged.
    const hasIndent = span.modifiers.some((m) => m.kind === 'indent');
    const childColExpr = hasIndent
      ? `${indentColExpr} + ${CODEGEN_INDENT_STEP}`
      : indentColExpr;
    const repeatsMod = span.modifiers.find((m) => m.kind === 'repeats');
    const isRepeats = repeatsMod !== undefined;
    // For `.repeats()` captures the inbound value IS an array of child
    // values (each element a single value to be dispatched). Map over
    // the array and call the per-element dispatcher — the slot helper's
    // array-handling code path would either infinite-loop (if the role
    // also accepts arrays as a whole, e.g. JSON's JsonArray) or pick the
    // wrong shape. For non-repeats captures the inbound value IS a
    // single value (which itself may be an array — e.g. JsonObject's
    // value field for a JsonArray AST) and goes straight through the
    // slot helper / dispatcher.
    //
    // When the inbound value is a STRING (the template-target inverse path —
    // the template scanner just sliced out one chunk between two literal
    // segments and the schema declared `.repeats({sep})`), split the chunk
    // by `sep` first and trim each element. Without the split, the per-
    // element dispatcher would receive the whole concatenated chunk (e.g.
    // `'FREQ=DAILY;COUNT=10'`) and either fail or silently match only the
    // first element, leaving the rest as "trailing content". When the slot
    // is `.repeats()` with NO sep declared, fall back to single-element
    // wrap — boundary detection for unseparated lists requires a deeper
    // change tracked under Phase 2.1+ (see iso-duration's schema note).
    if (isRepeats) {
      const sep = repeatsMod!.kind === 'repeats' ? repeatsMod!.sep : undefined;
      const arrayExpr = sep !== undefined && sep.length > 0
        ? `(Array.isArray(${valueExpr}) ? ${valueExpr} : ${valueExpr}.split(${jsString(sep)}).map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0))`
        : `(Array.isArray(${valueExpr}) ? ${valueExpr} : [${valueExpr}])`;
      if (roles.length === 1) {
        return `(${arrayExpr}.map((__e: any) => ${nodeDispatcherName(roles[0]!, target)}(__e, ${childColExpr})))`;
      }
      return `(${arrayExpr}.map((__e: any) => ${multiRoleSlotHelperName(roles, target)}(__e, ${childColExpr})))`;
    }
    if (roles.length === 1) {
      return `${nodeSlotHelperName(roles[0]!, target)}(${valueExpr}, ${childColExpr})`;
    }
    // Feature 2: multi-role recursive capture. The runtime value at each
    // array element is dispatched to whichever role's per-node inverse
    // dispatcher matches its shape — using the shared per-(roles, target)
    // helper emitted by `emitMultiRoleSlotHelper`.
    return `${multiRoleSlotHelperName(roles, target)}(${valueExpr}, ${childColExpr})`;
  }
  // No span found for this capture — defensive fallback. This shouldn't
  // happen because validate.ts checks that every $.name in a body refers
  // to a real span. Use the leaf helper so the build still runs.
  return `__invertSlotLeaf_${jsIdent(target)}(${valueExpr})`;
}

function emitScalarAssertion(
  expected: string | number | boolean | null,
  valueExpr: string,
): string {
  const litJs = jsLiteral(expected);
  return [
    `if (!Object.is(${valueExpr}, ${litJs})) {`,
    `  throw new Error("stringify: expected scalar ${escapeForError(litJs)}, got " + JSON.stringify(${valueExpr}));`,
    `}`,
  ].join('\n');
}

function emitTemplateBody(
  segments: ReadonlyArray<string>,
  captures: ReadonlyArray<string>,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  // Literal-segment scanner. segments.length === captures.length + 1.
  // Walk:
  //   start at offset 0
  //   require value starts with segments[0]; advance past it
  //   for each i: read up to next occurrence of segments[i+1] into captures[i]
  //   final: require remainder starts with segments[captures.length]
  //
  // Optional-tail handling (mirrors Gap A's forward fusion):
  //   The forward render path now suppresses an optional-absent slot AND
  //   its preceding whitespace separator. The inverse scanner must accept
  //   the same shape — when scanning for the separator that precedes an
  //   optional capture fails AND every capture from that point on is
  //   optional (or .repeats({min:0})), the scanner consumes the remainder
  //   for captures[i], records null for each tail optional capture, and
  //   exits cleanly. The "tail-only" restriction keeps the scanner
  //   deterministic; mid-list optional captures still require their
  //   separator to be present.
  const isOptional: ReadonlyArray<boolean> = captures.map(
    (name) => isOptionalCapture(production, name),
  );
  // Precompute: for each capture index, true iff every capture at j >= i is optional.
  const tailOptional: boolean[] = new Array(captures.length).fill(false);
  let allOpt = true;
  for (let j = captures.length - 1; j >= 0; j--) {
    if (!isOptional[j]) allOpt = false;
    tailOptional[j] = allOpt;
  }
  const lines: string[] = [];
  lines.push(
    `if (typeof ${valueExpr} !== "string") {`,
    `  throw new Error("stringify: expected string value for template body, got " + typeof ${valueExpr});`,
    `}`,
    `const __s: string = ${valueExpr};`,
    `let __pos = 0;`,
  );
  // Match leading segment
  const seg0 = segments[0] ?? '';
  if (seg0.length > 0) {
    lines.push(
      `if (__s.indexOf(${jsString(seg0)}, __pos) !== __pos) {`,
      `  throw new Error("stringify: expected leading literal ${escapeForError(jsString(seg0))} in template body");`,
      `}`,
      `__pos += ${seg0.length};`,
    );
  }
  for (let i = 0; i < captures.length; i++) {
    const nextSeg = segments[i + 1] ?? '';
    const capName = captures[i]!;
    const helperCall = slotHelperCall(capName, production, target, '__s.slice(__pos)');
    if (i === captures.length - 1 && nextSeg.length === 0) {
      // Last capture, no trailing separator: take the remainder. If the
      // last capture is itself optional and the input is already
      // exhausted, leave it null instead of capturing an empty slice —
      // matches the forward fusion's null-coalesce.
      if (isOptional[i]) {
        lines.push(
          `if (__pos >= __s.length) {`,
          `  captures${memberAccess(capName)} = null;`,
          `} else {`,
          `  captures${memberAccess(capName)} = ${helperCall};`,
          `  __pos = __s.length;`,
          `}`,
        );
      } else {
        lines.push(`captures${memberAccess(capName)} = ${helperCall};`);
        lines.push(`__pos = __s.length;`);
      }
    } else if (nextSeg.length === 0) {
      // Inner adjacent slots are blocked at derivation time, but be
      // defensive — empty separator between captures cannot be scanned.
      throw new Error(`emit/inverse: empty separator between captures '${capName}' and '${captures[i + 1]}'`);
    } else {
      const innerHelperCall = slotHelperCall(capName, production, target, '__s.slice(__pos, __end)');
      // If captures[i+1] is the start of a tail-optional run, missing
      // separator means every subsequent capture is absent. Consume the
      // remainder for captures[i] and null-out the optional tail.
      const nextIdx = i + 1;
      const nextIsTailOptional = nextIdx < captures.length && tailOptional[nextIdx];
      if (nextIsTailOptional) {
        const tailNullLines: string[] = [];
        for (let k = nextIdx; k < captures.length; k++) {
          tailNullLines.push(`  captures${memberAccess(captures[k]!)} = null;`);
        }
        lines.push(
          `{`,
          `  const __end = __s.indexOf(${jsString(nextSeg)}, __pos);`,
          `  if (__end < 0) {`,
          `    captures${memberAccess(capName)} = ${helperCall};`,
          `    __pos = __s.length;`,
          ...tailNullLines,
          `  } else {`,
          `    captures${memberAccess(capName)} = ${innerHelperCall};`,
          `    __pos = __end + ${nextSeg.length};`,
          `  }`,
          `}`,
        );
        // We've fully handled the rest of the captures in the tail-null
        // branch. The else branch falls through to the next loop iter.
        // Subsequent loop iterations will produce more code that only
        // executes when we took the else branch. To preserve that flow,
        // wrap subsequent iterations inside the else branch... but doing
        // that requires structural rewrite. Simpler: rely on the runtime
        // null-set; the subsequent iterations will be guarded by the
        // pos pointer (if pos == __s.length, scanning for nextSeg fails
        // again and the same tail-null logic fires, leaving them null).
        // The captures we set to null above will be overwritten by the
        // subsequent iteration's tail-null branch — same value, no harm.
      } else {
        lines.push(
          `{`,
          `  const __end = __s.indexOf(${jsString(nextSeg)}, __pos);`,
          `  if (__end < 0) {`,
          `    throw new Error("stringify: expected separator ${escapeForError(jsString(nextSeg))} after capture ${capName}");`,
          `  }`,
          `  captures${memberAccess(capName)} = ${innerHelperCall};`,
          `  __pos = __end + ${nextSeg.length};`,
          `}`,
        );
      }
    }
  }
  // Validate trailing remainder when there are no captures (literal-only template)
  // or when the final segment was non-empty and we already advanced past it.
  if (captures.length === 0 && segments.length > 0) {
    const tail = segments[segments.length - 1]!;
    if (tail.length > 0 && tail !== seg0) {
      // Shouldn't happen — single literal segment when captures.length === 0
      // means parts.length === 1. tail === seg0 by construction.
    }
  }
  // Strict end-of-input. If anything remains, this body did not actually
  // describe the input — surface a throw so dispatch can fall through to a
  // sibling production / role rather than silently returning a partial
  // rebuild. Required for spec rule 4 (bidirectional by default; failures
  // must not be runtime surprises). When the last capture consumed the
  // remainder explicitly (the helper above sets __pos = __s.length), the
  // check is a no-op.
  lines.push(
    `if (__pos !== __s.length) {`,
    `  throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");`,
    `}`,
  );
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Per-target dispatcher
// ---------------------------------------------------------------------------

// Per-(NodeType, target) inverse dispatcher. Gap C: the public entry point
// dispatches over the root node's productions only — sub-productions are
// reachable through recursive capture sites that statically know which
// child node type to invoke. validateInverseDiscrimination enforces
// distinguishability WITHIN a node-type, so the cases here are mutually
// exclusive for a well-formed schema.
function emitNodeDispatcher(
  info: NodeTypeInfo,
  target: string,
  prattBinary?: import('../infer/binary-operators.ts').BinaryProductionInfo,
): string {
  const fnName = nodeDispatcherName(info.name, target);
  // Phase 5c: when prattBinary is set, the dispatcher signature carries a
  // `__minPrec` parameter that's forwarded ONLY to the binary inverter; all
  // other inverters ignore it. The change is locally byte-stable for
  // non-Pratt nodes (those still get the original signature).
  const extraParam = prattBinary !== undefined ? ', __minPrec: number = -1' : '';
  const extraArg = prattBinary !== undefined ? ', __minPrec' : '';
  // Classify by InverseIR kind shape:
  //  - object-target: switch on literal-field discriminators
  //  - template-target: switch on leading literal prefix (longest match)
  //  - scalar/ref/array (rare): single production; emit a direct call
  //    or throw at runtime if multiple present (already blocked at derive time).
  type Branch = {
    readonly nodeName: string;
    readonly prodIdx: number;
    readonly ir: InverseIR;
    readonly target: string;
    // Carrying the production lets the substring-dispatch safety check
    // inspect span classes/modifiers to detect arbitrary-text captures.
    readonly production: Production;
  };
  const branches: Branch[] = [];
  for (let i = 0; i < info.productions.length; i++) {
    const production = info.productions[i]!;
    const entry = production.renders.get(target);
    if (!entry || !entry.inverseDerived) continue;
    // `body: null` is ambiguous between two intents:
    //   - "Opt out of this target" (e.g. CSS Comment's `json: null` — the
    //     production parses real content with captures but the body discards
    //     them; null acts as a sentinel that `merge` filters out).
    //   - "This production yields the literal null value" (e.g. JSON
    //     `JsonNull` parses `literal('null')` and produces null).
    // Distinguish by capture presence: capture-less productions whose body
    // is the literal null are intentional null-yielders and belong in the
    // dispatcher's scalars branch. Capture-having productions are opt-outs.
    if (entry.inverseDerived.kind === 'scalar' && entry.inverseDerived.value === null) {
      const hasCaptures = production.spans.some((s) => s.name !== undefined);
      if (hasCaptures) continue;
    }
    branches.push({ nodeName: info.name, prodIdx: i, ir: entry.inverseDerived, target, production });
  }
  if (branches.length === 0) {
    return `function ${fnName}(value: any, __indentCol: number = 0${extraParam}): string {
  throw new Error("stringify: no productions declared for node '${info.name}' target '${target}'");
}`;
  }
  // Phase 5c: when the dispatcher routes to a Pratt-detected binary
  // inverter, that one specific call site appends `__minPrec`; other
  // inverter calls stay unchanged. Helper below builds the correctly-
  // argumented call expression per branch.
  const inverterCall = (branch: Branch): string => {
    const isBinary = prattBinary !== undefined && branch.prodIdx === prattBinary.prodIdx;
    const extra = isBinary ? extraArg : '';
    return `${inverterName(branch.nodeName, branch.prodIdx, branch.target)}(value, __indentCol${extra})`;
  };
  // Group by kind for fast dispatch.
  const objects = branches.filter((b) => b.ir.kind === 'object');
  const templates = branches.filter((b) => b.ir.kind === 'template');
  const scalars = branches.filter((b) => b.ir.kind === 'scalar');
  const refs = branches.filter((b) => b.ir.kind === 'ref');
  const arrays = branches.filter((b) => b.ir.kind === 'array');
  const dynKeys = branches.filter((b) => b.ir.kind === 'dynKey');
  const merges = branches.filter((b) => b.ir.kind === 'merge');

  const lines: string[] = [];

  if (objects.length > 0) {
    lines.push('if (value !== null && typeof value === "object" && !Array.isArray(value)) {');
    // Build per-branch (literalConds, presenceConds) where presenceConds
    // distinguish a branch from any other branch with identical literal
    // conditions via field-name presence. Order branches so more-specific
    // (more conditions) come first — same idea as longest-match-first.
    type ObjBranch = Branch & { readonly ir: Extract<InverseIR, { kind: 'object' }> };
    const objBranches = objects as ReadonlyArray<ObjBranch>;
    type Compiled = { readonly branch: ObjBranch; readonly cond: string; readonly specificity: number };
    const compiled: Compiled[] = [];
    for (let i = 0; i < objBranches.length; i++) {
      const b = objBranches[i]!;
      const litCond = literalFieldsCondition(b.ir);
      const names = fieldNameSet(b.ir);
      // Other branches with identical literal-field map (i.e. literalCond
      // alone wouldn't tell them apart) — collect fields they DON'T have
      // that we DO, and fields they have that we DON'T.
      const presenceParts: string[] = [];
      for (let j = 0; j < objBranches.length; j++) {
        if (i === j) continue;
        const other = objBranches[j]!;
        const otherLitCond = literalFieldsCondition(other.ir);
        if (otherLitCond !== litCond) continue;
        const otherNames = fieldNameSet(other.ir);
        // A field present on us but not on the other: assert "name" in value.
        for (const n of names) {
          if (!otherNames.has(n)) {
            const c = `${jsString(n)} in value`;
            if (!presenceParts.includes(c)) presenceParts.push(c);
          }
        }
        // A field present on the other but not on us: assert !("name" in value).
        for (const n of otherNames) {
          if (!names.has(n)) {
            const c = `!(${jsString(n)} in value)`;
            if (!presenceParts.includes(c)) presenceParts.push(c);
          }
        }
      }
      const parts: string[] = [];
      if (litCond !== 'true') parts.push(litCond);
      for (const p of presenceParts) parts.push(p);
      const cond = parts.length === 0 ? 'true' : parts.join(' && ');
      compiled.push({ branch: b, cond, specificity: parts.length });
    }
    // Sort by specificity descending so the most-discriminating branch is
    // tried first — relevant when one branch is a strict subset of another's
    // conditions.
    compiled.sort((x, y) => y.specificity - x.specificity);
    for (const c of compiled) {
      const call = inverterCall(c.branch);
      if (c.cond === 'true') {
        lines.push(`  return ${call};`);
      } else {
        lines.push(`  if (${c.cond}) return ${call};`);
      }
    }
    lines.push('}');
  }
  if (arrays.length > 0) {
    lines.push('if (Array.isArray(value)) {');
    // Discriminate by length (already validated as unique in invert.ts).
    for (const b of arrays) {
      const ir = b.ir as Extract<InverseIR, { kind: 'array' }>;
      const call = inverterCall(b);
      lines.push(`  if (value.length === ${ir.elements.length}) return ${call};`);
    }
    lines.push('}');
  }
  if (templates.length > 0) {
    lines.push('if (typeof value === "string") {');
    // Two-stage dispatch (Fix 1):
    //  1) Branches with a non-empty leading literal prefix dispatch on
    //     `value.startsWith(<prefix>)`, longest-first.
    //  2) Branches sharing a leading prefix (empty or otherwise) with one or
    //     more siblings use a unique embedded literal segment as the
    //     discriminator — `value.includes(<unique-literal>)`, longest-first.
    //  3) A branch that has no unique discriminator vs. its siblings becomes
    //     the fallback (at most one — validateInverseDiscrimination rejected
    //     the schema if there were two such branches sharing a prefix).
    type TplBranch = Branch & { readonly ir: Extract<InverseIR, { kind: 'template' }> };
    // Feature 1 (spec Design rule 5): when two or more template branches
    // are structurally identical (same segments AND same captures), the
    // inverse dispatcher cannot distinguish them — and need not. Group by
    // (segments, captures) shape and keep only the lowest-index branch
    // from each group; the dropped duplicates would have emitted dead
    // `if` clauses checking the same discriminator. Round-trip stays
    // value-stable: rebuilding through the chosen production yields a
    // source whose re-render to this target matches the input value.
    const allTpls = templates as ReadonlyArray<TplBranch>;
    const tpls: TplBranch[] = [];
    const groupSeen = new Set<string>();
    for (const b of allTpls) {
      const key = templateShapeKey(b.ir);
      if (groupSeen.has(key)) continue;
      groupSeen.add(key);
      tpls.push(b);
    }
    // Plan classification:
    //  - 'safe-prefix': value.startsWith(non-empty literal). Routes correctly
    //    by definition — no sibling shares this prefix.
    //  - 'substring': value.indexOf(literal) >= 0. The literal is unique to
    //    THIS branch's template segments vs siblings, but if any sibling
    //    captures arbitrary text (.string()/.until()/.rawUntil()) the
    //    sibling's runtime value could embed the literal and mis-route.
    //    Treated as a tentative match: try the inverter, fall through to
    //    the next plan on throw. The inverter is a position-anchored
    //    template scanner — it succeeds only when value's actual structure
    //    matches THIS template's literal segments at the expected offsets.
    //  - 'fallback': no embedded-literal discriminator vs siblings. Try
    //    the inverter blind; on throw fall through.
    //
    // Phase 2.2 (Roadmap): the previous algorithm emitted plain
    // `value.indexOf(lit) >= 0` for the substring case with no fallback
    // path, plus a console.warn at codegen — the dispatcher would mis-route
    // and the inverter's failure would bubble up as the raw template-scan
    // throw. The current algorithm wraps every non-safe-prefix branch in
    // try/catch so dispatcher → inverter → next-branch chains cleanly. The
    // safe-prefix branches still short-circuit (their inverters always
    // succeed when the prefix matches, by construction).
    type PlanKind = 'safe-prefix' | 'substring' | 'fallback';
    type Plan = {
      readonly branch: TplBranch;
      readonly check: string | null; // null only when kind === 'fallback'
      readonly priority: number;     // higher = tried earlier
      readonly kind: PlanKind;
    };
    const plans: Plan[] = [];
    for (const b of tpls) {
      const prefix = b.ir.segments[0] ?? '';
      if (prefix.length > 0) {
        plans.push({
          branch: b,
          check: `value.startsWith(${jsString(prefix)})`,
          priority: prefix.length,
          kind: 'safe-prefix',
        });
        continue;
      }
      // Empty leading prefix: search for a unique embedded literal — a
      // non-empty segment present in our segments but not appearing in any
      // segment of any sibling with the same (empty) leading prefix.
      const sameLeadingSiblings = tpls.filter((other) =>
        other !== b && (other.ir.segments[0] ?? '') === prefix
      );
      const ourLiterals = b.ir.segments.filter((s) => s.length > 0);
      // Pick the longest unique literal so the check is most-specific.
      let bestLit: string | null = null;
      for (const lit of ourLiterals) {
        let foundInSibling = false;
        for (const sib of sameLeadingSiblings) {
          for (const sibSeg of sib.ir.segments) {
            if (sibSeg.includes(lit)) { foundInSibling = true; break; }
          }
          if (foundInSibling) break;
        }
        if (!foundInSibling) {
          if (bestLit === null || lit.length > bestLit.length) bestLit = lit;
        }
      }
      if (bestLit !== null) {
        plans.push({
          branch: b,
          check: `value.indexOf(${jsString(bestLit)}) >= 0`,
          priority: bestLit.length,
          kind: 'substring',
        });
      } else {
        plans.push({ branch: b, check: null, priority: -1, kind: 'fallback' });
      }
    }
    // Order: discriminating branches first (longest discriminator first),
    // fallback branches last. Stable across schemas with the same shape.
    plans.sort((a, b) => b.priority - a.priority);
    // Emit safe-prefix branches as plain `if (check) return call;` — when
    // the prefix matches there is no possibility of mis-routing. Substring
    // and fallback branches wrap the inverter in try/catch so the next
    // plan in priority order gets a chance when this one's template scan
    // throws. After the chain falls through, the dispatcher's tail throw
    // ("no production matches") fires with the original value for triage.
    for (const p of plans) {
      const call = inverterCall(p.branch);
      if (p.kind === 'safe-prefix') {
        lines.push(`  if (${p.check}) return ${call};`);
      } else if (p.kind === 'substring') {
        // Guard the try with the substring check so we skip the throw cost
        // for values that obviously don't contain our discriminator.
        lines.push(`  if (${p.check}) { try { return ${call}; } catch (_e) { /* try next */ } }`);
      } else {
        // Fallback: no discriminator. Try unconditionally; fall through on throw.
        lines.push(`  try { return ${call}; } catch (_e) { /* try next */ }`);
      }
    }
    lines.push('}');
  }
  if (refs.length > 0) {
    // Bare-ref bodies (`ast: $.x`) — the dispatcher's accept condition
    // depends on what shape the capture span can produce:
    //   .repeats()          → array
    //   .of(roles)          → union (any shape — recursive role(s) decide)
    //   class/.until()      → string (or whatever the class captures)
    //   .optional() on any  → also allows null
    // Without this analysis we'd either miss valid inputs (e.g. JsonNull's
    // null) or accept invalid ones (e.g. a yaml-item ref accepting arrays
    // that belong to its parent's .repeats() slot).
    const cond = refsAcceptCondition(info.productions, refs);
    if (cond === 'always') {
      for (const b of refs) {
        const call = inverterCall(b);
        lines.push(`return ${call};`);
      }
    } else {
      lines.push(`if (${cond}) {`);
      for (const b of refs) {
        const call = inverterCall(b);
        lines.push(`  return ${call};`);
      }
      lines.push('}');
    }
  }
  if (scalars.length > 0) {
    for (const b of scalars) {
      const ir = b.ir as Extract<InverseIR, { kind: 'scalar' }>;
      const lit = jsLiteral(ir.value);
      const call = inverterCall(b);
      lines.push(`if (Object.is(value, ${lit})) return ${call};`);
    }
  }
  if (dynKeys.length > 0) {
    // Single-entry object shape. Discriminate productions by the runtime
    // type of the entry value, which is statically determined by the
    // production's value-IR kind (ref → string-leaf, merge/dynKey/object
    // → object). The matching production handles the actual capture
    // extraction in its body inverter.
    lines.push('if (value !== null && typeof value === "object" && !Array.isArray(value)) {');
    lines.push('  const __dkKeys = Object.keys(value);');
    lines.push('  if (__dkKeys.length === 1) {');
    lines.push('    const __dkV = (value as Record<string, unknown>)[__dkKeys[0]!];');
    for (const b of dynKeys) {
      const valueIR = (b.ir as Extract<InverseIR, { kind: 'dynKey' }>).value;
      const cond = dynKeyEntryTypeCondition(valueIR, info.productions[b.prodIdx]);
      const call = inverterCall(b);
      if (cond === 'true') lines.push(`    return ${call};`);
      else lines.push(`    if (${cond}) return ${call};`);
    }
    lines.push('  }');
    lines.push('}');
  }
  if (merges.length > 0) {
    // A merge body at the root of a node accepts any non-null, non-array
    // object — the body inverter iterates entries itself. Single production
    // expected per role at this layer (multiple merge-only productions for
    // one node type would be ambiguous; today only Stylesheet has this
    // shape).
    lines.push('if (value !== null && typeof value === "object" && !Array.isArray(value)) {');
    for (const b of merges) {
      const call = inverterCall(b);
      lines.push(`  return ${call};`);
    }
    lines.push('}');
  }

  lines.push(`throw new Error("stringify: no production matches for target '${target}' (value: " + JSON.stringify(value) + ")");`);

  return `function ${fnName}(value: any, __indentCol: number = 0${extraParam}): string {
${indent(lines.join('\n'), 1)}
}`;
}

// Feature 1: deterministic shape key for grouping structurally-identical
// template inverses. Two productions whose template body has the same
// segments and the same captures collapse to the same key, and the
// dispatcher keeps only the lowest-index occurrence (see callsite
// comment in emitNodeDispatcher).
function templateShapeKey(ir: Extract<InverseIR, { kind: 'template' }>): string {
  return JSON.stringify({ s: ir.segments, c: ir.captures });
}

/** JS condition expression on `__dkV` that's true when the entry value's
 *  runtime type matches the dynKey production's expected value-IR shape.
 *  Used by the per-node dispatcher to discriminate dynKey-bodied productions
 *  in the same role (e.g. CSS Declaration vs Rule when both have flat-shape
 *  `{ [key]: ... }` bodies — Decl expects string, Rule expects object). */
function dynKeyEntryTypeCondition(valueIR: InverseIR, production?: Production): string {
  switch (valueIR.kind) {
    case 'ref': {
      // Leaf — the entry value is captured directly by a single span. For
      // a non-recursive class span (e.g. CSS Declaration's `$.value` →
      // .until() string), the runtime type is a string. For a recursive
      // `.of(...)` span (e.g. JSON's JsonMember `$.value` → JsonValue),
      // the runtime type can be anything the role chain produces — admit
      // any defined value and let the role's dispatcher resolve.
      if (production) {
        const refSpan = production.spans.find((s) => s.name === valueIR.capture);
        if (refSpan && refSpan.recursiveRoles.length > 0) {
          return '__dkV !== undefined';
        }
      }
      return 'typeof __dkV === "string"';
    }
    case 'merge':
    case 'dynKey':
    case 'object':
      return '__dkV !== null && typeof __dkV === "object" && !Array.isArray(__dkV)';
    case 'array':
      return 'Array.isArray(__dkV)';
    case 'scalar':
    case 'template':
    case 'presence':
      // Falls through to "any" — uncommon in flat-shape bodies. If two
      // dynKey productions in the same role both reach this branch the
      // discrimination is undefined; declaration order wins.
      return 'true';
  }
}

function literalFieldsCondition(ir: Extract<InverseIR, { kind: 'object' }>): string {
  const conds: string[] = [];
  for (const field of ir.fields) {
    if (field.kind !== 'literal') continue;
    const access = `value${memberAccess(field.name)}`;
    conds.push(`Object.is(${access}, ${jsLiteral(field.value)})`);
  }
  if (conds.length === 0) return 'true';
  return conds.join(' && ');
}

// Returns the set of field names declared in an object-body inverse —
// literal AND inverse. Used by the dispatcher when literal-field values
// alone don't discriminate (e.g. one production has `flagged: true` and
// the other omits the field entirely; the dispatcher must additionally
// check `"flagged" in value`).
function fieldNameSet(ir: Extract<InverseIR, { kind: 'object' }>): Set<string> {
  const out = new Set<string>();
  for (const field of ir.fields) out.add(field.name);
  return out;
}

// ---------------------------------------------------------------------------
// Slot helper (per-(NodeType, target) recursion entry — Gap C)
// ---------------------------------------------------------------------------

// Per-(NodeType, target) slot helper. Each recursive capture site emits a
// call to `__invertSlotFor_<ChildNodeType>_<target>(value)` so the
// dispatcher routed-into is restricted to the statically-known child node
// type's productions — never the global production list. Behaviour for
// primitive/array shapes is unchanged.
function emitNodeSlotHelper(nodeName: string, target: string, isPrattAst: boolean = false): string {
  const helper = nodeSlotHelperName(nodeName, target);
  const childDispatch = nodeDispatcherName(nodeName, target);
  // Phase 5c: when the slot helper services a Pratt-detected node's 'ast'
  // target, plumb `__minPrec` through to the dispatcher. Non-Pratt slot
  // helpers keep the original signature for byte-stability.
  const extraParam = isPrattAst ? ', __minPrec: number = -1' : '';
  const extraArg = isPrattAst ? ', __minPrec' : '';
  // Returns whatever shape the rebuild expects to read back from captures:
  //   null/undefined → null (rebuild's optional-slot ternary checks for null;
  //                          coercing to "" would mask absent state and
  //                          leave dangling separators).
  //   string         → dispatch through the child node's inverter when it
  //                    accepts strings (string-template targets like 'html'
  //                    capture child substrings that still need to be
  //                    inverted back to source). Object-only dispatchers
  //                    throw, in which case the string is already
  //                    source-shaped and we pass it through.
  //   array          → array of inverted children (rebuild joins repeats
  //                    arrays with the correct separator via
  //                    __rebuildSlot(captures.x, sep); flattening here
  //                    would lose the per-element boundaries).
  //   object         → dispatch through the per-(NodeType, target) inverse
  //                    dispatcher to recursively rebuild the child into a
  //                    source string.
  //   other          → String(v).
  return `function ${helper}(v: any, __indentCol: number = 0${extraParam}): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return ${childDispatch}(v, __indentCol${extraArg}); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = ${helper}(v[i], __indentCol${extraArg});
        if (r != null) out.push(r);
      }
      return out;
    }
  }
  // null can be either an absent optional capture or an intentional null
  // value (e.g. JsonNull). Try the dispatcher first; on throw, treat as
  // absent (preserves optional-slot semantics for callers like rebuild's
  // optional-slot ternary).
  if (v === null) {
    try { return ${childDispatch}(v, __indentCol${extraArg}); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return ${childDispatch}(v, __indentCol${extraArg}); } catch (_e) { return v; }
  }
  if (typeof v === "object") return ${childDispatch}(v, __indentCol${extraArg});
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return ${childDispatch}(v, __indentCol${extraArg}); } catch (_e) { return String(v); }
}`;
}

// Feature 2: multi-role slot helper. A capture annotated with
// `.span(name, text, [Role1, Role2, ...])` produces values that may be
// instances of any of the listed roles. The helper recurses arrays
// element-wise, and for objects routes through each role's
// per-(NodeType, target) dispatcher in declared order — returning the
// first that succeeds (try/catch). String children also dispatch through
// each role (string-template targets like 'html' capture child substrings
// that still need to be inverted back to source); if no role accepts the
// string, it passes through unchanged so source-target captures (already
// source-shaped) round-trip cleanly.
//
// Determinism: the dispatcher within a single node-type is unambiguous
// post-`validateInverseDiscrimination`. Across roles, ordering is the
// schema-declared role order; if two roles share an indistinguishable
// production shape, the first role wins. `validateMultiRoleDiscrimination`
// surfaces a CompilerError when that would silently mis-route.
function emitMultiRoleSlotHelper(
  roles: ReadonlyArray<string>,
  target: string,
): string {
  const helper = multiRoleSlotHelperName(roles, target);
  const tryCalls: string[] = [];
  for (const role of roles) {
    const childDispatch = nodeDispatcherName(role, target);
    tryCalls.push(
      `    try { return ${childDispatch}(v, __indentCol); } catch (_e) { /* try next role */ }`,
    );
  }
  return `function ${helper}(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
${tryCalls.join('\n')}
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = ${helper}(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
${tryCalls.join('\n')}
    return null;
  }
  if (typeof v === "string") {
${tryCalls.join('\n')}
    return v;
  }
  if (typeof v === "object") {
${tryCalls.join('\n')}
    throw new Error("stringify: no role matched for multi-role capture (roles: ${roles.join(', ')}; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
${tryCalls.join('\n')}
  return String(v);
}`;
}

// Per-target leaf slot helper for non-recursive captures (primitives or
// arrays of primitives). No object branch — leaves never carry recursive
// children, so no per-node dispatcher is needed. Arrays still get
// per-element recursion through the same helper so nested arrays of
// strings unbox cleanly.
function emitLeafSlotHelper(target: string): string {
  const id = jsIdent(target);
  return `function __invertSlotLeaf_${id}(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  // Phase 4c v2: booleans pass through verbatim so synthetic presence
  // fields like __litPres survive the inverse without being coerced to
  // the string "true"/"false". Same for numbers (defensive — no existing
  // codegen path stores numbers in slots, but coercion would be a
  // silent bug in any future schema that does).
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_${id}(v[i]);
      if (r !== null && r !== undefined) out.push(r);
    }
    return out;
  }
  return String(v);
}`;
}

// Top-level dispatcher used by the public stringify table. Forwards to the
// per-(NodeType, target) dispatcher for the root node type only. Gap C:
// public entry never considers sub-production branches.
function emitRootDispatcher(rootType: string, target: string): string {
  const fnName = `__dispatchInverse_${jsIdent(target)}`;
  const rootCall = nodeDispatcherName(rootType, target);
  // The root dispatcher always starts with indentCol=0 (top-level context).
  // Per-node dispatchers accept __indentCol and thread it through but the
  // public stringify entry point never needs a caller-supplied column.
  return `function ${fnName}(value: any): string {
  return ${rootCall}(value, 0);
}`;
}

function nodeDispatcherName(nodeName: string, target: string): string {
  return `__dispatchInverse_${jsIdent(nodeName)}_${jsIdent(target)}`;
}

function nodeSlotHelperName(nodeName: string, target: string): string {
  return `__invertSlotFor_${jsIdent(nodeName)}_${jsIdent(target)}`;
}

// Feature 2: deterministic name for a multi-role slot helper. Roles are
// included in declaration order (not sorted) so the generated identifier
// reflects the dispatch order — the first role wins on ambiguous shapes.
function multiRoleSlotHelperName(
  roles: ReadonlyArray<string>,
  target: string,
): string {
  return `__invertSlotMulti_${roles.map((r) => jsIdent(r)).join('_')}_${jsIdent(target)}`;
}

// Feature 2: collect every (roles, target) combination used by any
// multi-role recursive capture in the schema. Keyed by target, with
// inner roles deduplicated by the joined role names so identical
// tuples emitted from multiple call sites share a single helper.
function collectMultiRoleCombos(
  schema: InferredSchema,
  targets: ReadonlyArray<string>,
): ReadonlyMap<string, ReadonlyArray<ReadonlyArray<string>>> {
  const out = new Map<string, ReadonlyArray<string>[]>();
  for (const target of targets) {
    const seen = new Map<string, ReadonlyArray<string>>();
    for (const info of schema.nodeTypes.values()) {
      for (const production of info.productions) {
        // Only consider productions that actually declare this target —
        // otherwise the slot helper would never be reached for that
        // (target, role-tuple) combination.
        if (!production.renders.has(target)) continue;
        for (const span of production.spans) {
          if (span.recursiveRoles.length <= 1) continue;
          const roles = [...span.recursiveRoles];
          const key = roles.join('|');
          if (!seen.has(key)) seen.set(key, roles);
        }
      }
    }
    out.set(target, [...seen.values()]);
  }
  return out;
}

/**
 * Collect (roles, target) pairs needed by merge-IR inverses. Each merge
 * body references a recursive repeats span — its `recursiveRoles` is the
 * combination we emit a specialized entry-dispatch helper for. Same
 * dedup convention as collectMultiRoleCombos.
 */
function collectMergeCombos(
  schema: InferredSchema,
  targets: ReadonlyArray<string>,
): ReadonlyMap<string, ReadonlyArray<ReadonlyArray<string>>> {
  const out = new Map<string, ReadonlyArray<string>[]>();
  for (const target of targets) {
    const seen = new Map<string, ReadonlyArray<string>>();
    for (const info of schema.nodeTypes.values()) {
      for (const production of info.productions) {
        const entry = production.renders.get(target);
        const ir = entry?.inverseDerived;
        if (!ir) continue;
        walkForMerge(ir, production, seen);
      }
    }
    out.set(target, [...seen.values()]);
  }
  return out;
}

/** Walk an InverseIR, registering every merge IR's role tuple into `seen`. */
function walkForMerge(
  ir: InverseIR,
  production: Production,
  seen: Map<string, ReadonlyArray<string>>,
): void {
  switch (ir.kind) {
    case 'merge': {
      const span = production.spans.find((s) => s.name === ir.arrayCapture);
      if (!span || span.recursiveRoles.length === 0) return;
      const roles = [...span.recursiveRoles];
      const key = roles.join('|');
      if (!seen.has(key)) seen.set(key, roles);
      return;
    }
    case 'dynKey':
      walkForMerge(ir.value, production, seen);
      return;
    case 'object':
      for (const f of ir.fields) {
        if (f.kind === 'inverse') walkForMerge(f.inverse, production, seen);
      }
      return;
    case 'array':
      for (const el of ir.elements) walkForMerge(el, production, seen);
      return;
    case 'scalar':
    case 'ref':
    case 'template':
    case 'presence':
      return;
  }
}

// ---------------------------------------------------------------------------
// Public stringify
// ---------------------------------------------------------------------------

function emitDispatchTable(targets: ReadonlyArray<string>): string {
  const entries = targets.map((target) => `  ${jsString(target)}: __dispatchInverse_${jsIdent(target)},`).join('\n');
  return `const __inverseDispatch: Record<string, (value: any) => string> = {
${entries}
};`;
}

function emitPublicStringify(overloads: string, preserveWs: boolean): string {
  const overloadBlock = overloads ? `${overloads}\n` : '';
  // Phase 4c v4: in preserve mode, prepend/append the root AST's
  // `__leadingWs` / `__trailingWs` fields when present. Hand-built ASTs
  // that don't carry the fields are unchanged.
  const wrap = preserveWs
    ? `
  const __out = fn(value);
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const __v = value as any;
    const __lead = typeof __v.__leadingWs === 'string' ? __v.__leadingWs : '';
    const __trail = typeof __v.__trailingWs === 'string' ? __v.__trailingWs : '';
    return __lead + __out + __trail;
  }
  return __out;`
    : `
  return fn(value);`;
  return `${overloadBlock}export function stringify(value: unknown, options?: { target?: string }): string {
  const target = options?.target ?? __defaultTarget;
  if (!target) {
    throw new Error("stringify: missing target; pass options.target or set defaultTarget on the schema");
  }
  const fn = __inverseDispatch[target];
  if (!fn) {
    throw new Error("stringify: unknown target '" + target + "'");
  }${wrap}
}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectTargets(schema: InferredSchema): ReadonlyArray<string> {
  const set = new Set<string>();
  for (const info of schema.nodeTypes.values()) {
    for (const production of info.productions) {
      for (const target of production.renders.keys()) set.add(target);
    }
  }
  return [...set].sort();
}

export function inverterName(nodeName: string, prodIdx: number, target: string): string {
  return `__invert_${jsIdent(nodeName)}_${prodIdx}_${jsIdent(target)}`;
}

function jsLiteral(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return jsString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  return value ? 'true' : 'false';
}

function escapeForError(literal: string): string {
  // The literal is already a JS source-form string (e.g. `"foo"`). We embed
  // it inside a double-quoted runtime error message, so the inner double
  // quotes must be escaped.
  return literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function memberAccess(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `.${key}`;
  return `[${jsString(key)}]`;
}

function jsIdent(name: string): string {
  return name.replace(/[^A-Za-z0-9_$]/g, '_');
}

function indent(source: string, level: number): string {
  const pad = '  '.repeat(level);
  return source
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n');
}

