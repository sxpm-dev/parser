// Phase 5b — Pratt forward emit.
//
// For each node type whose `binaryProductions.get(nodeType)` is set, emit
//   parse<NodeType>__alt<i>(state)            — one per alt (as today)
//   parse<NodeType>__primary(state)           — dispatches over non-binary
//                                              alts only (speculation chain)
//   parse<NodeType>__pratt(state, minPrec)    — climbing loop that consumes
//                                              operators by precedence and
//                                              synthesizes a binary captures
//                                              payload routed via
//                                              `__production`
//   parse<NodeType>(state)                    — entry; calls __pratt(state, 0)
//
// The binary alt function is still emitted (it carries the body/source-
// position logic and lives in the same dispatch table) but is never called
// from __primary — Pratt builds the binary captures directly.
//
// Captures contract: the synthesized binary node has the same `__production`
// routing key (`"<NodeType>#<binaryProdIdx>"`) and the same field names
// (leftCapture / opCapture / rightCapture) as the alt function would
// produce, so the render path stays unchanged.
//
// Domainless: this module reads schema shape only (binaryProductions,
// operatorLiterals, operatorPrecedence) — no schema-name or domain
// branches.

import type { BinaryProductionInfo } from '../../infer/binary-operators.ts';
import type { UnaryProductionInfo } from '../../infer/unary-operators.ts';
import type { InferredSchema, NodeTypeInfo } from '../../model.ts';
import { jsString } from '../strings.ts';
import { parseFnName } from './index.ts';

export function emitPrattNode(
  info: NodeTypeInfo,
  schema: InferredSchema,
  binaryInfo: BinaryProductionInfo,
  altFns: ReadonlyArray<string>,
): string {
  const fnName = parseFnName(schema, info.name);
  const altName = (i: number) => `${fnName}__alt${i}`;
  const primaryName = `${fnName}__primary`;
  const prattName = `${fnName}__pratt`;

  // Phase 5f: a unary-prefix production (if present) is invoked
  // implicitly by the primary's leading unary check, NOT through standard
  // speculation. Filter it out of primaryAltIdxs the same way the binary
  // production is filtered.
  const unaryInfo = schema.unaryProductions.get(info.name);
  const primaryAltIdxs = info.productions
    .map((_p, i) => i)
    .filter((i) =>
      i !== binaryInfo.prodIdx &&
      (unaryInfo === undefined || i !== unaryInfo.prodIdx)
    );

  const primary = emitPrimaryDispatcher(
    primaryName,
    primaryAltIdxs,
    altName,
    unaryInfo === undefined ? null : { info: unaryInfo, nodeName: info.name },
  );
  const pratt = emitPrattLoop(prattName, primaryName, info.name, schema, binaryInfo);
  const top = emitTopLevel(fnName, prattName);

  return [altFns.join('\n\n'), primary, pratt, top].join('\n\n');
}

// ---------------------------------------------------------------------------
// __primary dispatcher
// ---------------------------------------------------------------------------

function emitPrimaryDispatcher(
  primaryName: string,
  altIdxs: ReadonlyArray<number>,
  altName: (i: number) => string,
  unary: { readonly info: UnaryProductionInfo; readonly nodeName: string } | null,
): string {
  // Build the body lines for the standard-primary speculation chain
  // (without the leading unary check). Used both standalone and as the
  // tail of the unary-aware primary.
  const standardLines: string[] = [];
  if (altIdxs.length === 0) {
    standardLines.push('  return null;');
  } else if (altIdxs.length === 1) {
    standardLines.push(`  return ${altName(altIdxs[0]!)}(state);`);
  } else {
    for (let i = 0; i < altIdxs.length - 1; i++) {
      standardLines.push(`  { const r = ${altName(altIdxs[i]!)}(state); if (r !== null) return r; }`);
    }
    standardLines.push(`  return ${altName(altIdxs[altIdxs.length - 1]!)}(state);`);
  }
  if (unary === null) {
    return `function ${primaryName}(state: State): unknown {
${standardLines.join('\n')}
}`;
  }
  // Phase 5f: leading unary check. Skip ws, peek the input for any
  // declared unary operator (longest-first), and on hit consume it +
  // recurse into __primary itself for the operand. That recursion handles
  // chained unaries naturally (`!!a` → `!(!a)`) and naturally stops at
  // the next non-operator byte.
  //
  // On a non-match the standard speculation chain runs unchanged.
  const altsSorted = [...unary.info.operatorAlts].sort(
    (a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0),
  );
  const unaryBranches = altsSorted
    .map((op) => `if (${literalMatchExpr(op, 'off')}) { __unaryOp = ${jsString(op)}; __unaryLen = ${op.length}; }`)
    .join(' else ');
  const prodKey = `${unary.nodeName}#${unary.info.prodIdx}`;
  const opField = jsObjectKey(unary.info.opCapture);
  const operandField = jsObjectKey(unary.info.operandCapture);
  return `function ${primaryName}(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let __unaryOp: string | null = null;
  let __unaryLen = 0;
  if (off < len) {
    ${unaryBranches}
  }
  if (__unaryOp !== null) {
    const __unaryEntry = state.pos;
    state.pos = off + __unaryLen;
    if (state.pos > state.maxOff) state.maxOff = state.pos;
    const __operand = ${primaryName}(state);
    if (__operand === null) { state.pos = __unaryEntry; return null; }
    const __unary: any = { __production: ${jsString(prodKey)}, ${opField}: __unaryOp, ${operandField}: __operand };
    if (state.mode === 'raws') {
      __unary.source = makeSource(state, __unaryEntry, state.pos);
    }
    return __unary;
  }
${standardLines.join('\n')}
}`;
}

// ---------------------------------------------------------------------------
// __pratt climbing loop
// ---------------------------------------------------------------------------

function emitPrattLoop(
  prattName: string,
  primaryName: string,
  nodeType: string,
  schema: InferredSchema,
  binaryInfo: BinaryProductionInfo,
): string {
  // Order the operator scan by precedence layer descending (tightest first)
  // so a longer multi-byte operator wins over its single-byte alternative
  // when both share a leading byte AND have different precedence layers
  // (e.g. `==` vs `=`). Within the same length, alphabetical for
  // determinism. The standard `operatorLiterals` is sorted longest-first
  // already, which is the right key for matching — reuse it.
  const ops = schema.operatorLiterals;

  // Lookup table from operator literal to its precedence layer index.
  // Emit as a plain `const` map. The Pratt loop reads it with `[op]`.
  // Pure-unary operators (declared only via `.operator([...])` on a
  // unary production, not via the schema's `operators:` map) have no
  // precedence — the lookup returns undefined and the loop breaks
  // naturally. Emit only the binary-eligible ops here.
  const precEntries = ops
    .filter((op) => schema.operatorPrecedence.has(op))
    .map((op) => `  ${jsString(op)}: ${schema.operatorPrecedence.get(op)},`);
  // Phase 5e: right-associative table. The Pratt loop uses this to decide
  // whether to recurse at `prec` (right-assoc) or `prec + 1` (left-assoc)
  // for the right operand. Default left-assoc — schemas opt in via
  // `operators: { layerName: { ops: [...], assoc: 'right' } }`.
  const rightAssocEntries = ops
    .filter((op) => schema.rightAssociativeOps.has(op))
    .map((op) => `  ${jsString(op)}: true,`);
  const rightAssocBlock = rightAssocEntries.length === 0
    ? '{}'
    : `{\n${rightAssocEntries.join('\n')}\n  }`;

  // Operator scan: a longest-first ladder of literal matches. Returns the
  // matched operator and its byte length.
  const scanBranches = ops
    .map((op) => {
      const match = literalMatchExpr(op, 'off');
      return `  if (${match}) { op = ${jsString(op)}; opLen = ${op.length}; }`;
    })
    .join(' else ');

  // Synthesized binary captures literal — field names follow the
  // schema-author's capture names so the render dispatcher routes through
  // unchanged. `__production` is the same key the binary alt would stamp
  // on success.
  const productionKey = `${nodeType}#${binaryInfo.prodIdx}`;
  const leftField = jsObjectKey(binaryInfo.leftCapture);
  const opField = jsObjectKey(binaryInfo.opCapture);
  const rightField = jsObjectKey(binaryInfo.rightCapture);

  // The Pratt loop. We track `entryOff` (where the WHOLE expression
  // started) so the synthesized binary node's `source` range covers the
  // full span. Each iteration: skip ws, peek for an operator, decide
  // whether to consume based on precedence, recurse for the right operand
  // at `prec + 1` (left-associative), and fold into a new captures object.
  return `function ${prattName}(state: State, minPrec: number): unknown {
  const __precTable: Record<string, number> = {
${precEntries.join('\n')}
  };
  const __rightAssoc: Record<string, boolean> = ${rightAssocBlock};
  const entryOff = state.pos;
  let left = ${primaryName}(state);
  if (left === null) return null;
  while (true) {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (off >= len) break;
    let op: string | null = null;
    let opLen = 0;
${scanBranches}
    if (op === null) break;
    const prec = __precTable[op]!;
    if (prec < minPrec) break;
    state.pos = off + opLen;
    if (state.pos > state.maxOff) state.maxOff = state.pos;
    // Phase 5e: right-assoc recurses at prec, left-assoc at prec + 1.
    const nextMinPrec = __rightAssoc[op] ? prec : prec + 1;
    const right = ${prattName}(state, nextMinPrec);
    if (right === null) {
      state.pos = entryOff;
      return null;
    }
    const __binary: any = { __production: ${jsString(productionKey)}, ${leftField}: left, ${opField}: op, ${rightField}: right };
    if (state.mode === 'raws') {
      __binary.source = makeSource(state, entryOff, state.pos);
    }
    left = __binary;
  }
  return left;
}`;
}

// ---------------------------------------------------------------------------
// Top-level entry
// ---------------------------------------------------------------------------

function emitTopLevel(fnName: string, prattName: string): string {
  return `function ${fnName}(state: State): unknown {
  return ${prattName}(state, 0);
}`;
}

// ---------------------------------------------------------------------------
// Local copies of the shared scan helpers (kept tiny — duplicating one
// line avoids pulling span.ts into the Pratt module's dependency graph).
// ---------------------------------------------------------------------------

function literalMatchExpr(text: string, offVar: string): string {
  if (text.length === 1) {
    return `input.charCodeAt(${offVar}) === ${text.charCodeAt(0)}`;
  }
  if (text.length === 2) {
    return `input.charCodeAt(${offVar}) === ${text.charCodeAt(0)} && input.charCodeAt(${offVar} + 1) === ${text.charCodeAt(1)}`;
  }
  return `input.startsWith(${jsString(text)}, ${offVar})`;
}

function jsObjectKey(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return key;
  return jsString(key);
}
