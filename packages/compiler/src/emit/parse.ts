import type { SpanModifier } from '@parser2/parser';
import { CompilerError, type InferredSchema, type NodeTypeInfo, type Production, type ResolvedSpan } from '../model.ts';
import { jsIdent, jsString } from './strings.ts';
import { collectOffsetRefs, emitStructureExpr } from './structure.ts';
import { typeIdConst } from './tokenize.ts';

// Emits one parseXxx(state) function per node type. The smoke-test slice has
// one production per node type so we can take the direct path; multi-
// production dispatch (with first-token lookahead) is a follow-on.

type Ctx = {
  readonly literalTypeByText: ReadonlyMap<string, string>;
  readonly nodeTypes: ReadonlyMap<string, NodeTypeInfo>;
  readonly tokenTypeIds: ReadonlyMap<string, number>;
  // Token type names whose tokenization maps to exactly one literal text.
  // For these the codegen can drop the value-equality check at every
  // expectLiteral / peekLiteral site (one int compare against TYPE_<NAME>
  // is sufficient). Types covering many literals (e.g. HTML's 'delim'
  // covers `?`, `/`, `:` etc.) need both type-id and value compares.
  readonly singleLiteralTypes: ReadonlySet<string>;
  readonly variant: ParseVariant;
  readonly capturedDispatch?: boolean;
};

type ParseVariant = 'fast' | 'raws' | 'validate';

export function emitNodeFunctions(schema: InferredSchema): string {
  const singleLiteralTypes = inferSingleLiteralTypes(schema);
  const parts: string[] = [];
  for (const variant of ['raws', 'fast', 'validate'] as const) {
    const ctx: Ctx = {
      literalTypeByText: schema.literalTypeByText,
      nodeTypes: schema.nodeTypes,
      tokenTypeIds: schema.tokenTypeIds,
      singleLiteralTypes,
      variant,
    };
    for (const info of schema.nodeTypes.values()) {
      parts.push(emitNodeFunction(info, ctx));
      const continuation = emitLeadingCaptureContinuationFunction(info, ctx);
      if (continuation) parts.push(continuation);
    }
  }
  return parts.join('\n\n');
}

// True iff every production starts with the same literal span. Then the
// multi-prod dispatcher routes by inspecting later spans, where values DO
// participate in the check — safe to elide the inner .oneOf on those later
// class spans.
function allProductionsShareLeadingLiteral(info: NodeTypeInfo): boolean {
  if (info.productions.length < 2) return false;
  const first = info.productions[0]!.spans[0];
  if (!first || first.class !== 'literal' || !first.text) return false;
  const headText = first.text;
  for (let i = 1; i < info.productions.length; i++) {
    const span = info.productions[i]!.spans[0];
    if (!span || span.class !== 'literal' || span.text !== headText) return false;
  }
  return true;
}

function inferSingleLiteralTypes(schema: InferredSchema): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const decl of schema.literals) counts.set(decl.type, (counts.get(decl.type) ?? 0) + 1);
  const single = new Set<string>();
  for (const [type, count] of counts) if (count === 1) single.add(type);
  return single;
}

// Emits the TYPE_ID_<NAME> reference used by codegen call sites.
function typeIdRef(typeName: string, ctx: Ctx): string {
  if (!ctx.tokenTypeIds.has(typeName)) {
    throw new Error(`emitter: no type ID for token type '${typeName}'`);
  }
  return typeIdConst(typeName);
}

// Pseudo-stop ID for "absent slot" — runtime captureUntil / scan helpers
// compare against this and never match. -1 is safe: real IDs start at 0.
const NO_TYPE_ID = '-1';

// Emits the (type-id, optional-value) helper-call expression for an
// expect/peek/consume on a literal token. Single-literal types drop the
// value compare entirely.
function expectLiteralCall(typeName: string, valueText: string, ctx: Ctx): string {
  const id = typeIdRef(typeName, ctx);
  if (ctx.singleLiteralTypes.has(typeName)) return `expectLiteralId(state, ${id}, ${jsString(valueText)})`;
  return `expectLiteralIdValue(state, ${id}, ${jsString(valueText)})`;
}

function consumeOptionalLiteralCall(typeName: string, valueText: string, ctx: Ctx): string {
  const id = typeIdRef(typeName, ctx);
  if (ctx.singleLiteralTypes.has(typeName)) return `consumeOptionalLiteralId(state, ${id}, ${jsString(valueText)})`;
  return `consumeOptionalLiteralIdValue(state, ${id}, ${jsString(valueText)})`;
}

function peekLiteralCall(typeName: string, valueText: string, ctx: Ctx): string {
  const id = typeIdRef(typeName, ctx);
  if (ctx.singleLiteralTypes.has(typeName)) return `peekLiteralId(state, ${id})`;
  return `peekLiteralIdValue(state, ${id}, ${jsString(valueText)})`;
}

function peekLiteralAfterCommentsCall(typeName: string, valueText: string, ctx: Ctx): string {
  const id = typeIdRef(typeName, ctx);
  if (ctx.singleLiteralTypes.has(typeName)) return `peekLiteralIdAfterComments(state, ${id})`;
  return `peekLiteralIdValueAfterComments(state, ${id}, ${jsString(valueText)})`;
}

function emitLeadingCaptureContinuationFunction(info: NodeTypeInfo, ctx: Ctx): string | null {
  if (ctx.variant !== 'fast') return null;
  const pattern = leadingCapturePattern(info.name, ctx);
  if (!pattern || !pattern.span.name) return null;

  const v = jsIdent(pattern.span.name);
  const structureOptions = { omitRaws: true };
  const offsetRefs = new Set<string>();
  for (const production of pattern.productions) {
    for (const ref of collectOffsetRefs(production.structure, structureOptions)) offsetRefs.add(ref);
  }
  const valueExpr = new Map<string, string>([[pattern.span.name, v]]);
  const presenceExpr = new Map<string, string>([[pattern.span.name, `(${v}.length > 0)`]]);
  const startOffExpr = new Map<string, string>();
  const endOffExpr = new Map<string, string>();
  const body = pattern.productions.length === 1
    ? emitFactoredBranch(pattern.productions[0]!, 1, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx)
    : emitFactoredContinuationBody(info, 1, valueExpr, presenceExpr, startOffExpr, endOffExpr, ctx);
  if (!body) return null;
  return `function ${continuationFnName(info.name, ctx.variant)}(state: State, ${v}: string): unknown {
${indent(body, 1)}
}`;
}

function emitNodeFunction(info: NodeTypeInfo, ctx: Ctx, fnNameOverride?: string): string {
  const fnName = fnNameOverride ?? parseFnName(info.name, ctx.variant);

  // Recovery productions are tried only as fallbacks after every valid
  // production has failed. Split them out and emit the existing dispatch
  // over the valid-only subset (under ${fnName}__valid), then wrap with a
  // try/catch that runs each recovery production via trySpeculate. If all
  // recoveries fail too, the valid dispatch's error is re-thrown.
  if (fnNameOverride === undefined) {
    const validProductions = info.productions.filter((p) => p.recovery === undefined);
    const recoveryProductions = info.productions.filter((p) => p.recovery !== undefined);
    if (recoveryProductions.length > 0) {
      if (validProductions.length === 0) {
        throw new CompilerError(`Node type '${info.name}' has only .recovers() productions — at least one valid production is required`);
      }
      return emitNodeFunctionWithRecovery(info.name, validProductions, recoveryProductions, ctx);
    }
  }

  if (info.productions.length === 1) {
    const body = emitProductionBody(info.productions[0]!, ctx);
    return `function ${fnName}(state: State): unknown {
${indent(body, 1)}
}`;
  }
  // Multi-production: emit each production as its own __alt function and a
  // dispatch wrapper that speculatively tries each. The last attempt runs
  // directly so its error propagates.
  const factored = emitFactoredTwoProductionFunction(info, ctx, fnName);
  if (factored) return factored;
  // Try the lookahead dispatch first. If we can generate a guarded direct
  // dispatch (no speculation), every __alt is reached only after the
  // dispatcher proved its discriminating .oneOf — so the inner check is
  // safe to elide. Without a guarded dispatcher (pure trySpeculate) the
  // .oneOf check is what makes the speculation fail-fast; keep it.
  //
  // BUT: the top-level dispatcher (emitFirstTokenProductionDispatch) strips
  // .oneOf values when checking the first token; only sub-dispatchers on
  // later spans actually filter by values. So elision is only safe when the
  // discriminating span is NOT span 0 — i.e. all productions share at least
  // one leading literal. In that case the dispatcher's value-check lands on
  // the first class span (span ≥ 1), making the inner .oneOf redundant.
  const lookaheadDispatch = emitProductionLookaheadDispatch(info, ctx, fnName);
  const altOptions = lookaheadDispatch && allProductionsShareLeadingLiteral(info)
    ? { skipFirstOneOfRefinement: true }
    : undefined;
  const altFns = info.productions.map((production, i) => {
    const body = emitProductionBody(production, ctx, altOptions);
    return `function ${fnName}__alt${i}(state: State): unknown {
${indent(body, 1)}
}`;
  }).join('\n\n');
  if (lookaheadDispatch) return `${altFns}\n\n${lookaheadDispatch}`;
  const speculativeAttempts = info.productions.slice(0, -1).map((_, i) =>
    `  { const r = trySpeculate(state, ${fnName}__alt${i}); if (r !== null) return r; }`,
  ).join('\n');
  const lastIdx = info.productions.length - 1;
  const dispatch = `function ${fnName}(state: State): unknown {
${speculativeAttempts}
  return ${fnName}__alt${lastIdx}(state);
}`;
  return `${altFns}\n\n${dispatch}`;
}

// Emit the public dispatcher for a node with recovery productions:
//
//   parseFoo(state) tries parseFoo__valid first. If it throws (any partial
//   consumption is rolled back by the catch resetting state.pos), each
//   recovery production is tried via trySpeculate in declaration order. If
//   none match either, the original valid-dispatch error propagates so the
//   caller sees a real syntax error and the source frame points at the
//   right offset.
//
// The valid-only dispatch is emitted by recursively calling emitNodeFunction
// with a synthetic info containing the valid productions and a renamed
// output function ${fnName}__valid. Each recovery production is emitted as
// a normal __recoveryN function via emitProductionBody — recovery production
// bodies are plain productions, not multi-dispatched.
function emitNodeFunctionWithRecovery(
  nodeName: string,
  validProductions: ReadonlyArray<Production>,
  recoveryProductions: ReadonlyArray<Production>,
  ctx: Ctx,
): string {
  const fnName = parseFnName(nodeName, ctx.variant);
  const validFnName = `${fnName}__valid`;
  const validInfo: NodeTypeInfo = { name: nodeName, productions: validProductions };
  const validDispatch = emitNodeFunction(validInfo, ctx, validFnName);

  const recoveryFns = recoveryProductions.map((production, i) => {
    const body = emitProductionBody(production, ctx);
    return `function ${fnName}__recovery${i}(state: State): unknown {
${indent(body, 1)}
}`;
  }).join('\n\n');

  const recoveryAttempts = recoveryProductions.map((_, i) =>
    `    const __r${i} = trySpeculate(state, ${fnName}__recovery${i});
    if (__r${i} !== null) return __r${i};`,
  ).join('\n');

  const wrapper = `function ${fnName}(state: State): unknown {
  const __recoverStart = state.pos;
  try {
    return ${validFnName}(state);
  } catch (__validErr) {
    state.pos = __recoverStart;
${recoveryAttempts}
    state.pos = __recoverStart;
    throw __validErr;
  }
}`;

  return `${validDispatch}\n\n${recoveryFns}\n\n${wrapper}`;
}

function emitFactoredTwoProductionFunction(info: NodeTypeInfo, ctx: Ctx, fnName: string = parseFnName(info.name, ctx.variant)): string | null {
  if (info.productions.length !== 2) return null;
  const [first, second] = info.productions;
  if (!first || !second) return null;

  let pivot = 0;
  while (
    pivot < first.spans.length
    && pivot < second.spans.length
    && sameSharedPrefixSpan(first.spans[pivot]!, second.spans[pivot]!)
  ) {
    pivot++;
  }

  const firstPivot = first.spans[pivot];
  const secondPivot = second.spans[pivot];
  if (!firstPivot || !secondPivot || !sameUntilCapture(firstPivot, secondPivot)) return null;
  const firstBranchLiteral = first.spans[pivot + 1];
  if (!firstBranchLiteral || firstBranchLiteral.class !== 'literal' || !firstBranchLiteral.text) return null;

  const firstUntil = findModifier(firstPivot.modifiers, 'until')!;
  const secondUntil = findModifier(secondPivot.modifiers, 'until')!;
  const mergedUntil: SpanModifier = {
    ...firstUntil,
    stops: [...new Set([...firstUntil.stops, ...secondUntil.stops])],
  };
  const mergedPivot: ResolvedSpan = {
    ...firstPivot,
    modifiers: firstPivot.modifiers.map((m) => (m.kind === 'until' ? mergedUntil : m)),
  };

  const structureOptions = ctx.variant === 'fast' || ctx.variant === 'validate' ? { omitRaws: true } : {};
  const firstOffsetRefs = collectOffsetRefs(first.structure, structureOptions);
  const secondOffsetRefs = collectOffsetRefs(second.structure, structureOptions);
  const commonOffsetRefs = new Set([...firstOffsetRefs, ...secondOffsetRefs]);
  const commonValue = new Map<string, string>();
  const commonPresence = new Map<string, string>();
  const commonStart = new Map<string, string>();
  const commonEnd = new Map<string, string>();
  const lines: string[] = [];

  if (ctx.variant === 'raws') {
    lines.push(`const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;`);
  }
  for (let i = 0; i < pivot; i++) {
    lines.push(emitSpan(
      first.spans[i]!,
      i + 1 < pivot ? first.spans[i + 1] : mergedPivot,
      commonValue,
      commonPresence,
      commonStart,
      commonEnd,
      commonOffsetRefs,
      ctx,
    ));
  }
  lines.push(emitSpan(
    mergedPivot,
    firstBranchLiteral,
    commonValue,
    commonPresence,
    commonStart,
    commonEnd,
    commonOffsetRefs,
    ctx,
  ));

  const branchType = ctx.literalTypeByText.get(firstBranchLiteral.text) ?? firstBranchLiteral.text;
  const firstBranch = emitFactoredBranch(first, pivot + 1, commonValue, commonPresence, commonStart, commonEnd, firstOffsetRefs, ctx);
  const secondBranch = emitFactoredBranch(second, pivot + 1, commonValue, commonPresence, commonStart, commonEnd, secondOffsetRefs, ctx);
  lines.push(`if (${peekLiteralAfterCommentsCall(branchType, firstBranchLiteral.text, ctx)}) {
${indent(firstBranch, 1)}
}`);
  lines.push(secondBranch);

  return `function ${fnName}(state: State): unknown {
${indent(lines.join('\n'), 1)}
}`;
}

function emitFactoredBranch(
  production: Production,
  startIndex: number,
  commonValue: ReadonlyMap<string, string>,
  commonPresence: ReadonlyMap<string, string>,
  commonStart: ReadonlyMap<string, string>,
  commonEnd: ReadonlyMap<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  const valueExpr = new Map(commonValue);
  const presenceExpr = new Map(commonPresence);
  const startOffExpr = new Map(commonStart);
  const endOffExpr = new Map(commonEnd);
  const lines: string[] = [];
  for (let i = startIndex; i < production.spans.length; i++) {
    lines.push(emitSpan(
      production.spans[i]!,
      production.spans[i + 1],
      valueExpr,
      presenceExpr,
      startOffExpr,
      endOffExpr,
      offsetRefs,
      ctx,
    ));
  }
  if (ctx.variant === 'raws') {
    lines.push(`const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;`);
  }
  if (ctx.variant === 'validate') {
    lines.push(`return;`);
    return lines.join('\n');
  }
  const structure = emitStructureExpr(production.structure, {
    valueExpr,
    presenceExpr,
    startOffExpr,
    endOffExpr,
  }, ctx.variant === 'fast' ? { omitRaws: true } : {});
  if (ctx.variant === 'fast') {
    lines.push(`return ${structure};`);
    return lines.join('\n');
  }
  lines.push(`const __struct: Record<string, unknown> = ${structure};`);
  lines.push(`__struct.source = makeSource(state, __startOff, __endOff);`);
  lines.push(`return __struct;`);
  return lines.join('\n');
}

function emitFactoredContinuationBody(
  info: NodeTypeInfo,
  startIndex: number,
  commonValue: ReadonlyMap<string, string>,
  commonPresence: ReadonlyMap<string, string>,
  commonStart: ReadonlyMap<string, string>,
  commonEnd: ReadonlyMap<string, string>,
  ctx: Ctx,
): string | null {
  if (info.productions.length !== 2) return null;
  const [first, second] = info.productions;
  if (!first || !second) return null;

  let pivot = startIndex;
  while (
    pivot < first.spans.length
    && pivot < second.spans.length
    && sameSharedPrefixSpan(first.spans[pivot]!, second.spans[pivot]!)
  ) {
    pivot++;
  }

  const firstPivot = first.spans[pivot];
  const secondPivot = second.spans[pivot];
  if (!firstPivot || !secondPivot || !sameUntilCapture(firstPivot, secondPivot)) return null;
  const firstBranchLiteral = first.spans[pivot + 1];
  if (!firstBranchLiteral || firstBranchLiteral.class !== 'literal' || !firstBranchLiteral.text) return null;

  const firstUntil = findModifier(firstPivot.modifiers, 'until')!;
  const secondUntil = findModifier(secondPivot.modifiers, 'until')!;
  const mergedUntil: SpanModifier = {
    ...firstUntil,
    stops: [...new Set([...firstUntil.stops, ...secondUntil.stops])],
  };
  const mergedPivot: ResolvedSpan = {
    ...firstPivot,
    modifiers: firstPivot.modifiers.map((m) => (m.kind === 'until' ? mergedUntil : m)),
  };

  const structureOptions = ctx.variant === 'fast' || ctx.variant === 'validate' ? { omitRaws: true } : {};
  const firstOffsetRefs = collectOffsetRefs(first.structure, structureOptions);
  const secondOffsetRefs = collectOffsetRefs(second.structure, structureOptions);
  const commonOffsetRefs = new Set([...firstOffsetRefs, ...secondOffsetRefs]);
  const valueExpr = new Map(commonValue);
  const presenceExpr = new Map(commonPresence);
  const startOffExpr = new Map(commonStart);
  const endOffExpr = new Map(commonEnd);
  const lines: string[] = [];

  for (let i = startIndex; i < pivot; i++) {
    lines.push(emitSpan(
      first.spans[i]!,
      i + 1 < pivot ? first.spans[i + 1] : mergedPivot,
      valueExpr,
      presenceExpr,
      startOffExpr,
      endOffExpr,
      commonOffsetRefs,
      ctx,
    ));
  }
  lines.push(emitSpan(
    mergedPivot,
    firstBranchLiteral,
    valueExpr,
    presenceExpr,
    startOffExpr,
    endOffExpr,
    commonOffsetRefs,
    ctx,
  ));

  const branchType = ctx.literalTypeByText.get(firstBranchLiteral.text) ?? firstBranchLiteral.text;
  const firstBranch = emitFactoredBranch(first, pivot + 1, valueExpr, presenceExpr, startOffExpr, endOffExpr, firstOffsetRefs, ctx);
  const secondBranch = emitFactoredBranch(second, pivot + 1, valueExpr, presenceExpr, startOffExpr, endOffExpr, secondOffsetRefs, ctx);
  lines.push(`if (${peekLiteralAfterCommentsCall(branchType, firstBranchLiteral.text, ctx)}) {
${indent(firstBranch, 1)}
}`);
  lines.push(secondBranch);
  return lines.join('\n');
}

function sameUntilCapture(a: ResolvedSpan, b: ResolvedSpan): boolean {
  const aUntil = findModifier(a.modifiers, 'until');
  const bUntil = findModifier(b.modifiers, 'until');
  if (!aUntil || !bUntil) return false;
  return a.name === b.name
    && a.class === b.class
    && a.recursiveRoles.length === 0
    && b.recursiveRoles.length === 0
    && aUntil.balanced === bUntil.balanced
    && aUntil.trim === bUntil.trim
    && aUntil.rejectSuffix === bUntil.rejectSuffix;
}

function sameSpanSignature(a: ResolvedSpan, b: ResolvedSpan): boolean {
  return a.name === b.name
    && a.class === b.class
    && (a.class !== 'literal' || a.text === b.text)
    && a.recursiveRoles.join('\0') === b.recursiveRoles.join('\0')
    && sameModifiers(a.modifiers, b.modifiers);
}

function sameModifiers(a: ReadonlyArray<SpanModifier>, b: ReadonlyArray<SpanModifier>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function emitProductionLookaheadDispatch(info: NodeTypeInfo, ctx: Ctx, fnName: string = parseFnName(info.name, ctx.variant)): string | null {
  const grouped = emitFirstTokenProductionDispatch(info, ctx, fnName);
  if (grouped) return grouped;

  if (info.productions.length !== 2) return null;
  const [first, second] = info.productions;
  if (!first || !second) return null;

  for (let i = 0; i < Math.min(first.spans.length, second.spans.length); i++) {
    const firstUntil = findModifier(first.spans[i]!.modifiers, 'until');
    const secondUntil = findModifier(second.spans[i]!.modifiers, 'until');
    if (!firstUntil || !secondUntil || !firstUntil.balanced || !secondUntil.balanced) continue;

    const uniqueStops = firstUntil.stops.filter((stop) => !secondUntil.stops.includes(stop));
    if (uniqueStops.length !== 1) continue;
    const next = first.spans[i + 1];
    if (!next || next.class !== 'literal' || next.text !== uniqueStops[0]) continue;

    const fallbackStops = secondUntil.stops.slice(0, 2);
    const stops = [uniqueStops[0]!, ...fallbackStops].slice(0, 3);
    const dispatch = `function ${fnName}(state: State): unknown {
  if (nextTopLevelStopId(state, ${stopIdArgs(stops, ctx)}) === ${literalTypeIdRef(uniqueStops[0]!, ctx)}) {
    const r = trySpeculate(state, ${fnName}__alt0);
    if (r !== null) return r;
  }
  return ${fnName}__alt1(state);
}`;
    return dispatch;
  }
  return null;
}

function emitFirstTokenProductionDispatch(info: NodeTypeInfo, ctx: Ctx, fnName: string = parseFnName(info.name, ctx.variant)): string | null {
  if (info.productions.length < 2) return null;

  const groups: Array<{ readonly first: FirstToken; readonly indexes: number[] }> = [];
  const fallback: number[] = [];
  const keyFor = (first: FirstToken): string => first.kind === 'literal'
    ? `${first.kind}:${first.type}:${first.value}`
    : `${first.kind}:${first.type}`;

  for (let i = 0; i < info.productions.length; i++) {
    const span = info.productions[i]?.spans[0];
    const first = span ? firstTokenForSpan(span, ctx) : null;
    if (!first) {
      fallback.push(i);
      continue;
    }
    const key = keyFor(first);
    let group = groups.find((candidate) => keyFor(candidate.first) === key);
    if (!group) {
      group = { first, indexes: [] };
      groups.push(group);
    }
    group.indexes.push(i);
  }

  if (groups.length === 0) return null;
  if (fallback.length > 0 && groups.length === 1) return null;
  groups.sort((a, b) => firstTokenSpecificity(b.first) - firstTokenSpecificity(a.first));

  const lines: string[] = [];
  lines.push(`function ${fnName}(state: State): unknown {`);
  lines.push(`  const __tokIdx = state.pos;`);
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    const first = group.first.kind === 'class' ? { kind: 'class' as const, type: group.first.type } : group.first;
    const check = emitFirstTokenCheck('__tokIdx', first, ctx);
    lines.push(`  ${i === 0 ? 'if' : 'else if'} (${check}) {`);
    lines.push(indent(emitProductionGroupDispatch(info, fnName, group.indexes, ctx), 2));
    lines.push(`  }`);
  }
  if (fallback.length > 0) {
    lines.push(`  else {`);
    lines.push(indent(emitProductionGroupDispatch(info, fnName, fallback, ctx), 2));
    lines.push(`  }`);
  } else {
    lines.push(`  throw new SyntaxError('no production matched');`);
  }
  lines.push(`}`);
  return lines.join('\n');
}

function emitProductionGroupDispatch(
  info: NodeTypeInfo,
  fnName: string,
  indexes: readonly number[],
  ctx: Ctx,
): string {
  if (indexes.length === 1) return `return ${fnName}__alt${indexes[0]}(state);`;
  const sharedPrefixDispatch = emitSharedPrefixRepeatedLiteralDispatch(info, indexes, ctx);
  if (sharedPrefixDispatch) return sharedPrefixDispatch;
  const sequenceDispatch = emitTokenSequenceProductionGroupDispatch(info, fnName, indexes, ctx, 1);
  if (sequenceDispatch) return sequenceDispatch;
  return emitSpeculativeProductionGroupDispatch(fnName, indexes);
}

function emitSharedPrefixRepeatedLiteralDispatch(
  info: NodeTypeInfo,
  indexes: readonly number[],
  ctx: Ctx,
): string | null {
  if (indexes.length !== 2) return null;
  const first = info.productions[indexes[0]!];
  const second = info.productions[indexes[1]!];
  if (!first || !second) return null;

  let pivot = 0;
  while (
    pivot < first.spans.length
    && pivot < second.spans.length
    && sameSharedPrefixSpan(first.spans[pivot]!, second.spans[pivot]!)
  ) {
    pivot++;
  }
  if (pivot < 1) return null;
  const sharedRepeat = first.spans[pivot - 1]!;
  const repeat = findModifier(sharedRepeat.modifiers, 'repeats');
  const firstLiteral = first.spans[pivot];
  const secondLiteral = second.spans[pivot];
  if (!repeat || sharedRepeat.recursiveRoles.length === 0) return null;
  if (repeat.sep) return null;
  if (!firstLiteral || !secondLiteral || firstLiteral.class !== 'literal' || secondLiteral.class !== 'literal') return null;
  if (!firstLiteral.text || !secondLiteral.text || firstLiteral.text === secondLiteral.text) return null;

  const structureOptions = ctx.variant === 'fast' || ctx.variant === 'validate' ? { omitRaws: true } : {};
  const firstOffsetRefs = collectOffsetRefs(first.structure, structureOptions);
  const secondOffsetRefs = collectOffsetRefs(second.structure, structureOptions);
  const offsetRefs = new Set([...firstOffsetRefs, ...secondOffsetRefs]);
  const valueExpr = new Map<string, string>();
  const presenceExpr = new Map<string, string>();
  const startOffExpr = new Map<string, string>();
  const endOffExpr = new Map<string, string>();
  const lines: string[] = [];

  if (ctx.variant === 'raws') {
    lines.push(`const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;`);
  }
  for (let i = 0; i < pivot - 1; i++) {
    lines.push(emitSpan(
      first.spans[i]!,
      first.spans[i + 1],
      valueExpr,
      presenceExpr,
      startOffExpr,
      endOffExpr,
      offsetRefs,
      ctx,
    ));
  }
  lines.push(emitSharedRepeatedSpan(
    sharedRepeat,
    repeat,
    [firstLiteral, secondLiteral],
    valueExpr,
    presenceExpr,
    startOffExpr,
    endOffExpr,
    offsetRefs,
    ctx,
  ));

  const firstType = ctx.literalTypeByText.get(firstLiteral.text) ?? firstLiteral.text;
  const secondType = ctx.literalTypeByText.get(secondLiteral.text) ?? secondLiteral.text;
  const firstBranch = emitFactoredBranch(first, pivot, valueExpr, presenceExpr, startOffExpr, endOffExpr, firstOffsetRefs, ctx);
  const secondBranch = emitFactoredBranch(second, pivot, valueExpr, presenceExpr, startOffExpr, endOffExpr, secondOffsetRefs, ctx);
  lines.push(`if (${peekLiteralCall(firstType, firstLiteral.text, ctx)}) {
${indent(firstBranch, 1)}
}`);
  lines.push(`if (${peekLiteralCall(secondType, secondLiteral.text, ctx)}) {
${indent(secondBranch, 1)}
}`);
  lines.push(`throw new SyntaxError('no production matched');`);
  return lines.join('\n');
}

function sameSharedPrefixSpan(a: ResolvedSpan, b: ResolvedSpan): boolean {
  if (a.recursiveRoles.length > 0 || b.recursiveRoles.length > 0) {
    return a.name === b.name
      && a.recursiveRoles.join('\0') === b.recursiveRoles.join('\0')
      && sameModifiers(a.modifiers, b.modifiers);
  }
  return sameSpanSignature(a, b);
}

function emitSharedRepeatedSpan(
  span: ResolvedSpan,
  repeats: Extract<SpanModifier, { kind: 'repeats' }>,
  stops: readonly ResolvedSpan[],
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  if (!span.name) return emitRepeatedSpan(span, repeats, undefined, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx);
  const listVar = jsIdent(span.name);
  const roles = span.recursiveRoles;
  const needsOffsets = ctx.variant === 'raws' || offsetRefs.has(span.name);
  valueExpr.set(span.name, listVar);
  presenceExpr.set(span.name, `(${listVar}.length > 0)`);
  if (needsOffsets) {
    startOffExpr.set(span.name, `__${listVar}_startOff`);
    endOffExpr.set(span.name, `__prevEnd_${listVar}`);
  }
  const stopPredicate = stops.map((stop) => {
    if (stop.class !== 'literal' || !stop.text) throw new Error('shared repeated stop must be a literal span');
    const type = ctx.literalTypeByText.get(stop.text) ?? stop.text;
    return peekLiteralCall(type, stop.text, ctx);
  }).join(' || ');
  const childDecl = roles.length === 1
    ? `const __child = ${parseFnName(roles[0]!, ctx.variant)}(state);`
    : emitRoleDispatchAssignment('__child', roles, ctx);
  const min = repeats.min ?? 0;
  const max = repeats.max;
  const minCheck = enforceMin(listVar, min, roles.join('|'));
  const maxCheck = enforceMax(listVar, max, roles.join('|'));
  const attachBefore = ctx.variant === 'raws'
    ? `attachRawsBefore(state, __child, __prevEnd_${listVar});`
    : '';
  const updatePrevEnd = needsOffsets
    ? ctx.variant === 'raws'
      ? `__prevEnd_${listVar} = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_${listVar};`
      : `__prevEnd_${listVar} = (state.pos > 0 ? state.ends[state.pos - 1] : __prevEnd_${listVar});`
    : '';
  const offsetDecls = needsOffsets
    ? `const __${listVar}_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
let __prevEnd_${listVar} = __${listVar}_startOff;`
    : '';
  const attachLine = attachBefore ? `  ${attachBefore}\n` : '';
  const updateLine = updatePrevEnd ? `  ${updatePrevEnd}\n` : '';
  return `${offsetDecls}
const ${listVar}: unknown[] = [];
while (!(${stopPredicate})) {
  const __before = state.pos;
  ${childDecl}
${attachLine}  ${listVar}.push(__child);
  if (state.pos === __before) break;
${updateLine}}${minCheck}${maxCheck}`;
}

function emitSpeculativeProductionGroupDispatch(fnName: string, indexes: readonly number[]): string {
  const lines: string[] = [];
  for (const index of indexes.slice(0, -1)) {
    lines.push(`{ const r = trySpeculate(state, ${fnName}__alt${index}); if (r !== null) return r; }`);
  }
  lines.push(`return ${fnName}__alt${indexes[indexes.length - 1]}(state);`);
  return lines.join('\n');
}

function emitTokenSequenceProductionGroupDispatch(
  info: NodeTypeInfo,
  fnName: string,
  indexes: readonly number[],
  ctx: Ctx,
  spanIndex: number,
): string | null {
  if (spanIndex > 8) return null;
  const groups: Array<{ readonly token: FirstToken; readonly indexes: number[] }> = [];
  const fallback: number[] = [];
  for (const index of indexes) {
    const span = info.productions[index]?.spans[spanIndex];
    const token = span ? firstTokenForSpan(span, ctx) : null;
    if (!token) {
      fallback.push(index);
      continue;
    }
    const key = firstTokenKey(token);
    let group = groups.find((candidate) => firstTokenKey(candidate.token) === key);
    if (!group) {
      group = { token, indexes: [] };
      groups.push(group);
    }
    group.indexes.push(index);
  }
  if (groups.length === 0) return null;
  if (fallback.length > 1) return null;
  groups.sort((a, b) => firstTokenSpecificity(b.token) - firstTokenSpecificity(a.token));

  const tokVar = `__tokIdx${spanIndex}`;
  const lines: string[] = [];
  lines.push(`const ${tokVar} = nthNonCommentPos(state, state.pos, ${spanIndex});`);

  // Hoist `tokenValue(state, idx).toLowerCase()` once when at least one
  // branch needs it. Without this every if/else branch re-slices and
  // re-toLowerCases the same span — fine semantically, but hot dispatchers
  // (HTML, CSS) call it thousands of times per parse.
  const needsLower = groups.some(
    (g) => g.token.kind === 'class' && g.token.values && g.token.values.length > 0,
  );
  const lowerVar = needsLower ? `${tokVar}__lower` : undefined;
  if (lowerVar) {
    lines.push(`const ${lowerVar} = ${tokVar} < state.count ? state.input.slice(state.starts[${tokVar}], state.ends[${tokVar}]).toLowerCase() : undefined;`);
  }

  groups.forEach((group, i) => {
    const check = emitFirstTokenCheck(tokVar, group.token, ctx, lowerVar);
    lines.push(`${i === 0 ? 'if' : 'else if'} (${check}) {`);
    const branch = group.indexes.length === 1
      ? `return ${fnName}__alt${group.indexes[0]}(state);`
      : emitTokenSequenceProductionGroupDispatch(info, fnName, group.indexes, ctx, spanIndex + 1)
        ?? emitSpeculativeProductionGroupDispatch(fnName, group.indexes);
    lines.push(indent(branch, 1));
    lines.push(`}`);
  });
  if (fallback.length === 1) {
    lines.push(`return ${fnName}__alt${fallback[0]}(state);`);
  } else {
    lines.push(`throw new SyntaxError('no production matched');`);
  }
  return lines.join('\n');
}

// `skipFirstOneOfRefinement` elides the runtime `.oneOf` check on the first
// class-typed span. Used when this production is reached via a multi-prod
// dispatcher that already filtered the value through the same .oneOf — the
// inner check is dead code on that path. Set by emitNodeFunction when a
// guarded dispatch wrapper was generated.
function emitProductionBody(
  production: Production,
  ctx: Ctx,
  options?: { readonly skipFirstOneOfRefinement?: boolean },
): string {
  const lines: string[] = [];
  const valueExpr = new Map<string, string>();
  const presenceExpr = new Map<string, string>();
  const startOffExpr = new Map<string, string>();
  const endOffExpr = new Map<string, string>();
  const spans = production.spans;
  const structureOptions = ctx.variant === 'fast' || ctx.variant === 'validate' ? { omitRaws: true } : {};
  const offsetRefs = collectOffsetRefs(production.structure, structureOptions);
  const needsNodeRange = ctx.variant === 'raws';
  let elideOneOfPending = options?.skipFirstOneOfRefinement === true;

  // Capture node-start before any spans are consumed.
  if (needsNodeRange) {
    lines.push(`const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;`);
  }

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    const next = spans[i + 1];
    const elide = elideOneOfPending && span.class !== 'literal';
    if (elide) elideOneOfPending = false;
    lines.push(emitSpan(span, next, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx, elide));
  }

  // After all spans, compute end from the last consumed token.
  if (needsNodeRange) {
    lines.push(`const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;`);
  }

  if (ctx.variant === 'validate') {
    lines.push(`return;`);
    return lines.join('\n');
  }

  const bindings = {
    valueExpr, presenceExpr, startOffExpr, endOffExpr,
  };
  const structure = emitStructureExpr(production.structure, bindings, structureOptions);
  if (ctx.variant === 'fast') {
    lines.push(`return ${structure};`);
    return lines.join('\n');
  }
  lines.push(`const __struct: Record<string, unknown> = ${structure};`);
  // Auto-attach source: { start, end }. The structure literal can't override
  // source — auto-attached after construction.
  lines.push(`__struct.source = makeSource(state, __startOff, __endOff);`);
  lines.push(`return __struct;`);
  return lines.join('\n');
}

function emitSpan(
  span: ResolvedSpan,
  next: ResolvedSpan | undefined,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
  elideOneOfRefinement: boolean = false,
): string {
  const optional = hasModifier(span.modifiers, 'optional');
  const repeats = findModifier(span.modifiers, 'repeats');
  const until = findModifier(span.modifiers, 'until');
  const rawUntil = findModifier(span.modifiers, 'rawUntil');
  const noWhitespaceAfter = hasModifier(span.modifiers, 'noWhitespaceAfter');

  if (rawUntil) {
    return emitRawUntilSpan(span, rawUntil, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx);
  }
  if (until) {
    return emitUntilSpan(span, until, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx);
  }
  if (repeats) {
    return emitRepeatedSpan(span, repeats, next, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx);
  }
  if (span.recursiveRoles.length > 0) {
    return emitRecursiveSpan(span, valueExpr, presenceExpr, optional, ctx);
  }
  if (span.class === 'literal') {
    return emitLiteralSpan(span, valueExpr, presenceExpr, startOffExpr, endOffExpr, optional, noWhitespaceAfter, offsetRefs, ctx);
  }
  return emitClassedSpan(span, valueExpr, presenceExpr, startOffExpr, endOffExpr, optional, noWhitespaceAfter, offsetRefs, ctx, elideOneOfRefinement);
}

// Helper: emit start/end offset variables for a consumed-from-tokens span,
// shared by literal and classed spans (both consume exactly one token).
//
// Optional unmatched case: we collapse the offsets to the end of the
// previously consumed token. This makes $.gap(prev, optional) evaluate to
// '' when the optional span was absent (rather than capturing trailing
// whitespace up to wherever the next non-trivia token sits).
function emitOneTokenOffsets(name: string, optional: boolean): string {
  const startVar = `__${name}_start`;
  const endVar = `__${name}_end`;
  if (optional) {
    return `const ${startVar} = ${name} !== null ? state.starts[state.pos - 1] : (state.pos > 0 ? state.ends[state.pos - 1] : 0);
const ${endVar} = ${name} !== null ? state.ends[state.pos - 1] : ${startVar};`;
  }
  return `const ${startVar} = state.starts[state.pos - 1];
const ${endVar} = state.ends[state.pos - 1];`;
}

function emitUntilSpan(
  span: ResolvedSpan,
  until: Extract<SpanModifier, { kind: 'until' }>,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  const stopsArgs = stopIdArgs(until.stops, ctx);
  const balanced = until.balanced ? 'true' : 'false';
  const trim = until.trim ? 'true' : 'false';
  const captureCall = `captureUntil(state, ${stopsArgs}, ${balanced}, ${trim})`;
  // rejectSuffix: if the captured (trimmed) value ends with the suffix,
  // throw so speculative dispatch can try the next production.
  const rejectCheck = until.rejectSuffix
    ? `if (__captured.endsWith(${jsString(until.rejectSuffix)})) throw new SyntaxError(${jsString(`captured value ends with rejected suffix '${until.rejectSuffix}'`)});\n`
    : '';
  if (span.name) {
    const v = jsIdent(span.name);
    const needsOffsets = ctx.variant === 'raws' || offsetRefs.has(span.name);
    valueExpr.set(span.name, v);
    presenceExpr.set(span.name, `(${v}.length > 0)`);
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${v}_start`);
      endOffExpr.set(span.name, `__${v}_end`);
    }
    const offsets = needsOffsets
      ? `\nconst __${v}_start = state.__lastCaptureStart;\nconst __${v}_end = state.__lastCaptureEnd;`
      : '';
    if (rejectCheck) {
      return `const __captured = ${captureCall};
${rejectCheck}const ${v} = __captured;
${emitSpanRefinementCheck(span, v, false, 'state.__lastCaptureStart')}
${offsets.trimStart()}`;
    }
    return `const ${v} = ${captureCall};
${emitSpanRefinementCheck(span, v, false, 'state.__lastCaptureStart')}${offsets}`;
  }
  if (rejectCheck) {
    return `{ const __captured = ${captureCall}; ${rejectCheck.trim()} }`;
  }
  return `${captureCall};`;
}

function emitStopBeforeCheck(stopBefore: ReadonlyArray<string> | undefined): string {
  if (!stopBefore || stopBefore.length === 0) return '';
  // Check upcoming source against each prefix literal at the current token's
  // start offset. If any matches, break out of the repeats loop. Used to
  // model implicit-close idioms (HTML <li>, <tr>, <td>, <p>, etc.).
  //
  // Performance: HTML implicit-close stop sets are large (50+ prefixes for
  // <p>). Two-level dispatch by first then second char so each iteration
  // does at most a small startsWith chain. For HTML `<p>` stopBefore, the
  // `<` first char + `<p` second char branch sees only the few prefixes
  // that start with `<p` (instead of all 50).
  const stops = stopBefore.filter((s) => s.length > 0);
  if (stops.length === 0) return '';
  const byFirstChar = new Map<number, string[]>();
  for (const s of stops) {
    const code = s.charCodeAt(0);
    const bucket = byFirstChar.get(code) ?? [];
    bucket.push(s);
    byFirstChar.set(code, bucket);
  }
  const branches: string[] = [];
  for (const [code, bucket] of [...byFirstChar.entries()].sort(([a], [b]) => a - b)) {
    bucket.sort((a, b) => b.length - a.length);
    if (bucket.length <= 3) {
      const conds = bucket
        .map((s) => `state.input.startsWith(${jsString(s)}, __off)`)
        .join(' || ');
      branches.push(`if (__c === ${code} && (${conds})) break;`);
      continue;
    }
    // Two-level: split by second char.
    const bySecondChar = new Map<number, string[]>();
    const singleChar: string[] = [];
    for (const s of bucket) {
      if (s.length < 2) {
        singleChar.push(s);
        continue;
      }
      const c2 = s.charCodeAt(1);
      const sub = bySecondChar.get(c2) ?? [];
      sub.push(s);
      bySecondChar.set(c2, sub);
    }
    const subBranches: string[] = [];
    for (const [code2, sub] of [...bySecondChar.entries()].sort(([a], [b]) => a - b)) {
      sub.sort((a, b) => b.length - a.length);
      const conds = sub
        .map((s) => `state.input.startsWith(${jsString(s)}, __off)`)
        .join(' || ');
      subBranches.push(`if (__c2 === ${code2} && (${conds})) break;`);
    }
    for (const lone of singleChar) {
      subBranches.push(`if (state.input.startsWith(${jsString(lone)}, __off)) break;`);
    }
    branches.push(`if (__c === ${code}) {
  const __c2 = state.input.charCodeAt(__off + 1);
  ${subBranches.join('\n  ')}
}`);
  }
  return `{
  const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const __c = state.input.charCodeAt(__off);
  ${branches.join('\n  ')}
}`;
}

function emitRawUntilSpan(
  span: ResolvedSpan,
  rawUntil: Extract<SpanModifier, { kind: 'rawUntil' }>,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  const stopsLit = `[${rawUntil.stops.map((s) => jsString(s)).join(', ')}]`;
  const caseLit = rawUntil.caseInsensitive ? 'true' : 'false';
  const captureCall = `captureRawUntil(state, ${stopsLit}, ${caseLit})`;
  if (span.name) {
    const v = jsIdent(span.name);
    const needsOffsets = ctx.variant === 'raws' || offsetRefs.has(span.name);
    valueExpr.set(span.name, v);
    presenceExpr.set(span.name, `(${v}.length > 0)`);
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${v}_start`);
      endOffExpr.set(span.name, `__${v}_end`);
    }
    const offsets = needsOffsets
      ? `\nconst __${v}_start = state.__lastCaptureStart;\nconst __${v}_end = state.__lastCaptureEnd;`
      : '';
    return `const ${v} = ${captureCall};${offsets}`;
  }
  return `${captureCall};`;
}

function emitLiteralSpan(
  span: ResolvedSpan,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  optional: boolean,
  noWhitespaceAfter: boolean,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  if (!span.text) throw new Error('emitter: literal span has no text');
  const type = ctx.literalTypeByText.get(span.text) ?? span.text;
  const adjacencyCheck = noWhitespaceAfter ? '\nrequireNoWhitespaceAfterLastToken(state);' : '';
  const optionalAdjacencyCheck = noWhitespaceAfter ? `\nif (${span.name ? jsIdent(span.name) : '__optional'} !== null) requireNoWhitespaceAfterLastToken(state);` : '';
  if (span.name) {
    const v = jsIdent(span.name);
    const needsOffsets = ctx.variant === 'raws' || offsetRefs.has(span.name);
    valueExpr.set(span.name, v);
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${v}_start`);
      endOffExpr.set(span.name, `__${v}_end`);
    }
    if (optional) {
      presenceExpr.set(span.name, `(${v} !== null)`);
      return `const ${v} = ${consumeOptionalLiteralCall(type, span.text, ctx)};
${optionalAdjacencyCheck.trimStart()}
${needsOffsets ? emitOneTokenOffsets(v, true) : ''}`;
    }
    return `const ${v} = ${expectLiteralCall(type, span.text, ctx)};${adjacencyCheck}${needsOffsets ? `\n${emitOneTokenOffsets(v, false)}` : ''}`;
  }
  if (optional) return noWhitespaceAfter
    ? `{ const __optional = ${consumeOptionalLiteralCall(type, span.text, ctx)}; if (__optional !== null) requireNoWhitespaceAfterLastToken(state); }`
    : `${consumeOptionalLiteralCall(type, span.text, ctx)};`;
  return `${expectLiteralCall(type, span.text, ctx)};${adjacencyCheck}`;
}

function emitClassedSpan(
  span: ResolvedSpan,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  optional: boolean,
  noWhitespaceAfter: boolean,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
  elideOneOfRefinement: boolean = false,
): string {
  const typeName = classToTokenType(span);
  const typeId = typeIdRef(typeName, ctx);
  const adjacencyCheck = noWhitespaceAfter ? '\nrequireNoWhitespaceAfterLastToken(state);' : '';
  const isComment = span.class === 'comment';
  if (span.name) {
    const v = jsIdent(span.name);
    const needsOffsets = ctx.variant === 'raws' || offsetRefs.has(span.name);
    valueExpr.set(span.name, v);
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${v}_start`);
      endOffExpr.set(span.name, `__${v}_end`);
    }
    if (optional) {
      presenceExpr.set(span.name, `(${v} !== null)`);
      const call = `consumeOptionalClassId(state, ${typeId})`;
      const refinementCheck = emitSpanRefinementCheck(span, v, true, 'state.starts[state.pos - 1]', elideOneOfRefinement);
      if (isComment) {
        const optionalCommentAdjacencyCheck = noWhitespaceAfter ? `\nif (__raw_${v} !== null) requireNoWhitespaceAfterLastToken(state);` : '';
        return `const __raw_${v} = ${call};
const ${v} = __raw_${v} === null ? null : commentInterior(__raw_${v});
${optionalCommentAdjacencyCheck.trimStart()}
${refinementCheck}${needsOffsets ? `
const __${v}_start = __raw_${v} !== null ? state.starts[state.pos - 1] : (state.pos > 0 ? state.ends[state.pos - 1] : 0);
const __${v}_end = __raw_${v} !== null ? state.ends[state.pos - 1] : __${v}_start;` : ''}`;
      }
      const optionalAdjacencyCheck = noWhitespaceAfter ? `\nif (${v} !== null) requireNoWhitespaceAfterLastToken(state);` : '';
      return `const ${v} = ${call};
${optionalAdjacencyCheck.trimStart()}
${refinementCheck}
${needsOffsets ? emitOneTokenOffsets(v, true) : ''}`;
    }
    const call = `expectClassId(state, ${typeId}, ${jsString(typeName)})`;
    const refinementCheck = emitSpanRefinementCheck(span, v, false, 'state.starts[state.pos - 1]', elideOneOfRefinement);
    if (isComment) {
      return `const __raw_${v} = ${call};
const ${v} = commentInterior(__raw_${v});
${adjacencyCheck}${refinementCheck}${needsOffsets ? `
const __${v}_start = state.starts[state.pos - 1];
const __${v}_end = state.ends[state.pos - 1];` : ''}`;
    }
    return `const ${v} = ${call};
${adjacencyCheck}${refinementCheck}${needsOffsets ? `\n${emitOneTokenOffsets(v, false)}` : ''}`;
  }
  if (optional) return noWhitespaceAfter
    ? `{ const __optional = consumeOptionalClassId(state, ${typeId}); if (__optional !== null) requireNoWhitespaceAfterLastToken(state); }`
    : `consumeOptionalClassId(state, ${typeId});`;
  return `expectClassId(state, ${typeId}, ${jsString(typeName)});${adjacencyCheck}`;
}

function emitSpanRefinementCheck(span: ResolvedSpan, valueVar: string, optional: boolean, positionExpr: string, elideOneOf: boolean = false): string {
  const checks: string[] = [];
  for (const refinement of span.refinements) {
    if (refinement.name === 'oneOf') {
      if (elideOneOf) continue;
      const values = refinement.args?.[0];
      if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) continue;
      const condition = oneOfCondition(valueVar, values.map((value) => value.toLowerCase()));
      const message = `expected one of ${values.join(', ')} at position `;
      checks.push(optional
        ? `if (${valueVar} !== null && !(${condition})) throw new SyntaxError(${jsString(message)} + ${positionExpr});`
        : `if (!(${condition})) throw new SyntaxError(${jsString(message)} + ${positionExpr});`);
      continue;
    }
    if (refinement.name === 'hexString') {
      const message = 'expected hex string at position ';
      checks.push(optional
        ? `if (${valueVar} !== null && !isHexString(${valueVar})) throw new SyntaxError(${jsString(message)} + ${positionExpr});`
        : `if (!isHexString(${valueVar})) throw new SyntaxError(${jsString(message)} + ${positionExpr});`);
      continue;
    }
    if (refinement.name === 'lengths') {
      const values = refinement.args?.[0];
      if (!Array.isArray(values) || values.some((value) => !Number.isInteger(value))) continue;
      const condition = values.map((value) => `${valueVar}.length === ${value}`).join(' || ') || 'false';
      const message = `expected length ${values.join(', ')} at position `;
      checks.push(optional
        ? `if (${valueVar} !== null && !(${condition})) throw new SyntaxError(${jsString(message)} + ${positionExpr});`
        : `if (!(${condition})) throw new SyntaxError(${jsString(message)} + ${positionExpr});`);
    }
  }
  return checks.join('\n');
}

function emitRecursiveSpan(
  span: ResolvedSpan,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  optional: boolean,
  ctx: Ctx,
): string {
  const roles = span.recursiveRoles;
  const callExpr = roles.length === 1
    ? `${parseFnName(roles[0]!, ctx.variant)}(state)`
    : emitRoleDispatchExpr(roles, ctx);
  if (ctx.variant === 'validate') {
    if (optional) {
      return roles.length === 1
        ? `trySpeculate(state, ${parseFnName(roles[0]!, ctx.variant)});`
        : `tryRolesOrNull(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}]);`;
    }
    return `${callExpr};`;
  }
  if (span.name) {
    const v = jsIdent(span.name);
    valueExpr.set(span.name, v);
    if (optional) {
      const speculative = roles.length === 1
        ? `trySpeculate(state, ${parseFnName(roles[0]!, ctx.variant)})`
        : `tryRolesOrNull(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}])`;
      presenceExpr.set(span.name, `(${v} !== null)`);
      return `const ${v} = ${speculative};`;
    }
    return `const ${v} = ${callExpr};`;
  }
  if (optional) return `${callExpr};`;
  return `${callExpr};`;
}

function emitRepeatedSpan(
  span: ResolvedSpan,
  repeats: Extract<SpanModifier, { kind: 'repeats' }>,
  next: ResolvedSpan | undefined,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  if (span.recursiveRoles.length === 0) {
    throw new Error(`emitter v1: .repeats() on non-recursive span is not implemented`);
  }
  const roles = span.recursiveRoles;
  const listVar = span.name ? jsIdent(span.name) : '_repeated';
  const needsOffsets = ctx.variant === 'raws' || (span.name ? offsetRefs.has(span.name) : false);
  const validateChildCall = roles.length === 1
    ? `${parseFnName(roles[0]!, ctx.variant)}(state);`
    : `${emitRoleDispatchExpr(roles, ctx)};`;
  if (ctx.variant === 'validate') {
    const stopPredicate = stopPredicateFor(next, ctx);
    const sep = repeats.sep;
    const min = repeats.min ?? 0;
    const max = repeats.max;
    const minCheck = min > 0
      ? `\nif (__count_${listVar} < ${min}) throw new SyntaxError(${jsString(`expected at least ${min} ${roles.join('|')}`)});`
      : '';
    const maxCheck = max === undefined
      ? ''
      : `\nif (__count_${listVar} > ${max}) throw new SyntaxError(${jsString(`expected at most ${max} ${roles.join('|')}`)});`;
    if (!sep) {
      return `let __count_${listVar} = 0;
while (!(${stopPredicate})) {
  const __before = state.pos;
  ${validateChildCall}
  __count_${listVar}++;
  if (state.pos === __before) break;
}${minCheck}${maxCheck}`;
    }
    const sepType = ctx.literalTypeByText.get(sep) ?? sep;
    const sepPeek = peekLiteralCall(sepType, sep, ctx);
    const sepExpect = expectLiteralCall(sepType, sep, ctx);
    return `let __count_${listVar} = 0;
while (!(${stopPredicate})) {
  while (${sepPeek}) {
    ${sepExpect};
  }
  if (${stopPredicate}) break;
  const __before = state.pos;
  ${validateChildCall}
  __count_${listVar}++;
  if (state.pos === __before) break;
  while (${sepPeek}) {
    ${sepExpect};
  }
}${minCheck}${maxCheck}`;
  }
  const childDecl = roles.length === 1
    ? `const __child = ${parseFnName(roles[0]!, ctx.variant)}(state);`
    : emitRoleDispatchAssignment('__child', roles, ctx);
  if (span.name) {
    valueExpr.set(span.name, listVar);
    presenceExpr.set(span.name, `(${listVar}.length > 0)`);
    // start = end of the previously consumed token (the body's opening
    // literal, e.g. '{', or 0 for the root container). end = __prevEnd,
    // which the body loop maintains as it consumes children.
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${listVar}_startOff`);
      endOffExpr.set(span.name, `__prevEnd_${listVar}`);
    }
  }

  const stopPredicate = stopPredicateFor(next, ctx);
  const sep = repeats.sep;
  const trailing = repeats.trailing ?? 'forbidden';
  const min = repeats.min ?? 0;
  const max = repeats.max;
  const minCheck = enforceMin(listVar, min, roles.join('|'));
  const maxCheck = enforceMax(listVar, max, roles.join('|'));

  // raws.before tracking: after each child parse, attach raws.before set
  // to the source slice from the previous sibling's end offset (or the
  // end of the body's opening token — e.g. '{' — for the first child) to
  // this child's source.start.offset. For root containers, the initial
  // prevEnd is 0.
  //
  // __<name>_startOff records the body-start offset (frozen) so $.tail or
  // $.gap that references the repeats span as 'from' can use the right
  // anchor — i.e. just after the opening literal, not advancing with the
  // loop.
  const attachBefore = ctx.variant === 'raws'
    ? `attachRawsBefore(state, __child, __prevEnd_${listVar});`
    : '';
  const updatePrevEnd = needsOffsets
    ? ctx.variant === 'raws'
      ? `__prevEnd_${listVar} = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_${listVar};`
      : `__prevEnd_${listVar} = (state.pos > 0 ? state.ends[state.pos - 1] : __prevEnd_${listVar});`
    : '';
  const offsetDecls = needsOffsets
    ? `const __${listVar}_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
let __prevEnd_${listVar} = __${listVar}_startOff;`
    : '';
  const attachLine = attachBefore ? `  ${attachBefore}\n` : '';
  const updateLine = updatePrevEnd ? `  ${updatePrevEnd}\n` : '';
  const stopBeforeCheck = emitStopBeforeCheck(repeats.stopBefore);
  const stopBeforeLine = stopBeforeCheck ? `  ${stopBeforeCheck}\n` : '';

  if (!sep) {
    return `${offsetDecls}
const ${listVar}: unknown[] = [];
while (!(${stopPredicate})) {
${stopBeforeLine}  const __before = state.pos;
  ${childDecl}
${attachLine}  ${listVar}.push(__child);
  if (state.pos === __before) break;
${updateLine}}${minCheck}${maxCheck}`;
  }

  const sepType = ctx.literalTypeByText.get(sep) ?? sep;
  const sepPeek = peekLiteralCall(sepType, sep, ctx);
  const sepExpect = expectLiteralCall(sepType, sep, ctx);

  // Separator is OPTIONAL between children — consume when present, but don't
  // require it. This lets a single repeats group mix children that naturally
  // need a separator (declarations: `prop: val;`) with children that don't
  // (rules: `.foo {}`, at-rules with their own terminator).
  return `${offsetDecls}
const ${listVar}: unknown[] = [];
while (!(${stopPredicate})) {
${stopBeforeLine}  // Tolerate stray leading separators (e.g. \`a {;; color: red }\`).
  // The separators are silently consumed; they're recoverable as raws
  // because raws.before for the next child is computed against
  // __prevEnd_${listVar} (which doesn't advance during this skip).
  while (${sepPeek}) {
    ${sepExpect};
  }
  if (${stopPredicate}) break;
  const __before = state.pos;
  ${childDecl}
${attachLine}  ${listVar}.push(__child);
  if (state.pos === __before) break;
${updateLine}  while (${sepPeek}) {
    ${sepExpect};
  }
}${minCheck}${maxCheck}`;
}

type FirstToken =
  | { readonly kind: 'literal'; readonly type: string; readonly value: string }
  | { readonly kind: 'class'; readonly type: string; readonly values?: readonly string[] };

function emitRoleDispatchExpr(roles: ReadonlyArray<string>, ctx: Ctx): string {
  const keyed: string[] = [];
  const fallback: string[] = [];
  const seenKeys = new Set<string>();

  for (const role of roles) {
    const first = firstTokenForRole(role, ctx);
    if (!first) {
      fallback.push(role);
      continue;
    }
    const key = firstTokenKey(first);
    if (seenKeys.has(key)) {
      fallback.push(role);
      continue;
    }
    seenKeys.add(key);
    keyed.push(role);
  }

  if (keyed.length === 0) {
    return rolesDispatchCall(roles, ctx);
  }
  keyed.sort((a, b) => firstTokenSpecificity(firstTokenForRole(b, ctx)!) - firstTokenSpecificity(firstTokenForRole(a, ctx)!));

  const lines: string[] = [];
  lines.push(`(() => {`);
  lines.push(`  const __tokIdx = state.pos;`);
  for (const role of keyed) {
    const first = firstTokenForRole(role, ctx)!;
    const check = emitFirstTokenCheck('__tokIdx', first, ctx);
    lines.push(`  if (${check}) return ${parseFnName(role, ctx.variant)}(state);`);
  }
  const fallbackRoles = [...fallback, ...roles.filter((role) => !keyed.includes(role) && !fallback.includes(role))];
  const fallbackDispatch = emitFallbackDispatch(fallbackRoles, ctx, '  ');
  lines.push(fallbackDispatch);
  lines.push(`})()`);
  return lines.join('\n');
}

function emitRoleDispatchAssignment(target: string, roles: ReadonlyArray<string>, ctx: Ctx): string {
  const keyed: string[] = [];
  const fallback: string[] = [];
  const seenKeys = new Set<string>();

  for (const role of roles) {
    const first = firstTokenForRole(role, ctx);
    if (!first) {
      fallback.push(role);
      continue;
    }
    const key = firstTokenKey(first);
    if (seenKeys.has(key)) {
      fallback.push(role);
      continue;
    }
    seenKeys.add(key);
    keyed.push(role);
  }

  const lines: string[] = [];
  lines.push(`let ${target}: unknown;`);
  if (keyed.length > 0) {
    keyed.sort((a, b) => firstTokenSpecificity(firstTokenForRole(b, ctx)!) - firstTokenSpecificity(firstTokenForRole(a, ctx)!));
    lines.push(`const __tokIdx = state.pos;`);
    keyed.forEach((role, i) => {
      const first = firstTokenForRole(role, ctx)!;
      const check = emitFirstTokenCheck('__tokIdx', first, ctx);
      lines.push(`${i === 0 ? 'if' : 'else if'} (${check}) { ${target} = ${parseFnName(role, ctx.variant)}(state); }`);
    });
    const fallbackRoles = [...fallback, ...roles.filter((role) => !keyed.includes(role) && !fallback.includes(role))];
    lines.push(`else {`);
    lines.push(indent(emitFallbackAssignment(target, fallbackRoles, ctx), 1));
    lines.push(`}`);
    return lines.join('\n');
  }

  lines.push(emitFallbackAssignment(target, roles, ctx));
  return lines.join('\n');
}

function emitFallbackAssignment(target: string, roles: ReadonlyArray<string>, ctx: Ctx): string {
  const capturedDispatch = emitCapturedUntilAssignment(target, roles, ctx);
  if (capturedDispatch) return capturedDispatch;

  if (roles.length === 2) {
    const first = untilThenLiteralForRole(roles[0]!, ctx);
    if (first) {
      const firstFn = parseFnName(roles[0]!, ctx.variant);
      const secondFn = parseFnName(roles[1]!, ctx.variant);
      if (first.rejectSuffix) {
        return `if (nextTopLevelStopId(state, ${stopIdArgs(first.stops, ctx)}) === ${literalTypeIdRef(first.literal, ctx)}) {
  const __first = trySpeculate(state, ${firstFn});
  ${target} = __first !== null ? __first : ${secondFn}(state);
} else {
  ${target} = ${secondFn}(state);
}`;
      }
      return `if (nextTopLevelStopId(state, ${stopIdArgs(first.stops, ctx)}) === ${literalTypeIdRef(first.literal, ctx)}) {
  ${target} = ${firstFn}(state);
} else {
  ${target} = ${secondFn}(state);
}`;
    }
  }
  return `${target} = ${rolesDispatchCall(roles, ctx)};`;
}

function emitCapturedUntilAssignment(target: string, roles: ReadonlyArray<string>, ctx: Ctx): string | null {
  if (ctx.variant !== 'fast') return null;
  if (roles.length !== 2) return null;
  const primary = leadingCapturePattern(roles[0]!, ctx);
  const secondary = leadingCapturePattern(roles[1]!, ctx);
  if (!primary || !secondary) return null;
  if (!primary.until.balanced || !secondary.until.balanced) return null;
  if (!primary.until.stops.includes(primary.literal) || !secondary.until.stops.includes(secondary.literal)) return null;
  if (primary.literal === secondary.literal) return null;

  const structureOptions = ctx.variant === 'fast' || ctx.variant === 'validate' ? { omitRaws: true } : {};
  const primaryOffsetRefs = new Set<string>();
  for (const production of primary.productions) {
    for (const ref of collectOffsetRefs(production.structure, structureOptions)) primaryOffsetRefs.add(ref);
  }
  const secondaryOffsetRefs = new Set<string>();
  for (const production of secondary.productions) {
    for (const ref of collectOffsetRefs(production.structure, structureOptions)) secondaryOffsetRefs.add(ref);
  }
  const secondaryValueBranch = factoredContinuationPivot(secondary, 1);
  const lines: string[] = [];
  const secondaryWatchPair = secondaryValueBranch
    ? literalTypeIdValuePair(secondaryValueBranch.literal, ctx)
    : `${NO_TYPE_ID}, ""`;
  const secondaryLiteralPair = literalTypeIdValuePair(secondary.literal, ctx);
  lines.push(`const __scan = scanTopLevelBoundary(state, ${stopIdArgs(primary.until.stops, ctx)}, ${secondaryLiteralPair}, ${secondaryWatchPair});`);
  lines.push(`if (__scan.stopId === ${literalTypeIdRef(primary.literal, ctx)}) {`);
  lines.push(indent(emitCapturedProbeBranch(
    target,
    primary,
    secondary.role,
    '__scan.firstIdx',
    '__scan.captureEndIdx',
    '__scan.stopIdx',
    primaryOffsetRefs,
    ctx,
  ), 1));
  lines.push(`} else {`);
  lines.push(indent(secondaryValueBranch
    ? emitCapturedSecondaryValueBranch(target, secondary, secondaryValueBranch, secondaryOffsetRefs, ctx)
    : emitCapturedRoleBranch(
    target,
    secondary,
    '__scan.firstIdx',
    '__scan.watchIdx',
    '__scan.watchIdx',
    1,
    secondaryOffsetRefs,
    ctx,
    false,
    null,
  ), 1));
  lines.push(`}`);
  return lines.join('\n');
}

function emitCapturedProbeBranch(
  target: string,
  pattern: LeadingCapturePattern,
  rejectFallbackRole: string,
  firstIdxExpr: string,
  endIdxExpr: string,
  nextPosExpr: string,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  const v = pattern.span.name ? jsIdent(pattern.span.name) : '__captured';
  const valueExpr = new Map<string, string>();
  const presenceExpr = new Map<string, string>();
  const startOffExpr = new Map<string, string>();
  const endOffExpr = new Map<string, string>();
  if (pattern.span.name) {
    valueExpr.set(pattern.span.name, v);
    presenceExpr.set(pattern.span.name, `(${v}.length > 0)`);
    if (ctx.variant === 'raws' || offsetRefs.has(pattern.span.name)) {
      startOffExpr.set(pattern.span.name, `__${v}_start`);
      endOffExpr.set(pattern.span.name, `__${v}_end`);
    }
  }
  const lines: string[] = [];
  lines.push(`const ${v} = captureTokenRange(state, ${firstIdxExpr}, ${endIdxExpr}, ${pattern.until.trim ? 'true' : 'false'});`);
  if (pattern.until.rejectSuffix) {
    lines.push(`if (${v}.endsWith(${jsString(pattern.until.rejectSuffix)})) {`);
    lines.push(`  state.pos = ${firstIdxExpr};`);
    lines.push(`  ${target} = ${parseFnName(rejectFallbackRole, ctx.variant)}(state);`);
    lines.push(`} else {`);
    lines.push(`  state.pos = ${nextPosExpr};`);
    lines.push(`  ${target} = ${continuationFnName(pattern.role, ctx.variant)}(state, ${v});`);
    lines.push(`}`);
  } else {
    lines.push(`state.pos = ${nextPosExpr};`);
    lines.push(`${target} = ${continuationFnName(pattern.role, ctx.variant)}(state, ${v});`);
  }
  return lines.join('\n');
}

type LeadingCapturePattern = {
  readonly role: string;
  readonly span: ResolvedSpan;
  readonly until: Extract<SpanModifier, { kind: 'until' }>;
  readonly literal: string;
  readonly productions: ReadonlyArray<Production>;
};

type ContinuationPivot = {
  readonly pivot: number;
  readonly span: ResolvedSpan;
  readonly until: Extract<SpanModifier, { kind: 'until' }>;
  readonly literal: string;
};

function factoredContinuationPivot(pattern: LeadingCapturePattern, startIndex: number): ContinuationPivot | null {
  if (pattern.productions.length !== 2) return null;
  const [first, second] = pattern.productions;
  if (!first || !second) return null;
  let pivot = startIndex;
  while (
    pivot < first.spans.length
    && pivot < second.spans.length
    && sameSpanSignature(first.spans[pivot]!, second.spans[pivot]!)
  ) {
    pivot++;
  }
  const firstPivot = first.spans[pivot];
  const secondPivot = second.spans[pivot];
  const literal = first.spans[pivot + 1];
  const until = firstPivot ? findModifier(firstPivot.modifiers, 'until') : undefined;
  if (!firstPivot || !secondPivot || !until || !sameUntilCapture(firstPivot, secondPivot)) return null;
  if (!literal || literal.class !== 'literal' || !literal.text) return null;
  return { pivot, span: firstPivot, until, literal: literal.text };
}

function leadingCapturePattern(role: string, ctx: Ctx): LeadingCapturePattern | null {
  const info = ctx.nodeTypes.get(role);
  if (!info || info.productions.length === 0) return null;
  const firstProduction = info.productions[0]!;
  const firstSpan = firstProduction.spans[0];
  const secondSpan = firstProduction.spans[1];
  const until = firstSpan ? findModifier(firstSpan.modifiers, 'until') : undefined;
  if (!firstSpan || !secondSpan || !until || secondSpan.class !== 'literal' || !secondSpan.text) return null;
  for (const production of info.productions) {
    const span = production.spans[0];
    const literal = production.spans[1];
    if (!span || !literal || !sameUntilCapture(firstSpan, span)) return null;
    if (literal.class !== 'literal' || literal.text !== secondSpan.text) return null;
  }
  return { role, span: firstSpan, until, literal: secondSpan.text, productions: info.productions };
}

function emitCapturedSecondaryValueBranch(
  target: string,
  pattern: LeadingCapturePattern,
  pivot: ContinuationPivot,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  const [first, second] = pattern.productions;
  if (!first || !second || !pattern.span.name || !pivot.span.name) return `${target} = ${parseFnName(pattern.role, ctx.variant)}(state);`;

  const prop = jsIdent(pattern.span.name);
  const value = jsIdent(pivot.span.name);
  const valueExpr = new Map<string, string>([[pattern.span.name, prop], [pivot.span.name, value]]);
  const presenceExpr = new Map<string, string>([
    [pattern.span.name, `(${prop}.length > 0)`],
    [pivot.span.name, `(${value}.length > 0)`],
  ]);
  const startOffExpr = new Map<string, string>();
  const endOffExpr = new Map<string, string>();
  const commonLines: string[] = [];
  for (let i = 1; i < pivot.pivot; i++) {
    commonLines.push(emitSpan(
      first.spans[i]!,
      first.spans[i + 1],
      valueExpr,
      presenceExpr,
      startOffExpr,
      endOffExpr,
      offsetRefs,
      ctx,
    ));
  }

  const firstBranch = emitFactoredBranch(first, pivot.pivot + 1, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx);
  const secondBranch = emitFactoredBranch(second, pivot.pivot + 1, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx);

  return `if (__scan.watchIdx < 0) {
  ${target} = ${parseFnName(pattern.role, ctx.variant)}(state);
} else {
  const ${prop} = captureTokenRange(state, __scan.firstIdx, __scan.watchIdx, ${pattern.until.trim ? 'true' : 'false'});
  state.pos = __scan.watchIdx;
${indent(commonLines.join('\n'), 1)}
  const __valueStart = state.pos;
  if (__scan.watch1Idx >= 0) {
    const ${value} = captureTokenRange(state, __valueStart, __scan.watch1Idx, ${pivot.until.trim ? 'true' : 'false'});
    state.pos = __scan.watch1Idx;
    ${target} = (() => {
${indent(firstBranch, 3)}
    })();
  } else {
    const ${value} = captureTokenRange(state, __valueStart, __scan.captureEndIdx, ${pivot.until.trim ? 'true' : 'false'});
    state.pos = __scan.stopIdx;
    ${target} = (() => {
${indent(secondBranch, 3)}
    })();
  }
}`;
}

function emitCapturedRoleBranch(
  target: string,
  pattern: LeadingCapturePattern,
  firstIdxExpr: string,
  endIdxExpr: string,
  nextPosExpr: string,
  startIndex: number,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
  allowRejectFallback: boolean,
  rejectFallbackRole: string | null,
): string {
  const v = pattern.span.name ? jsIdent(pattern.span.name) : '__captured';
  const valueExpr = new Map<string, string>();
  const presenceExpr = new Map<string, string>();
  const startOffExpr = new Map<string, string>();
  const endOffExpr = new Map<string, string>();
  if (pattern.span.name) {
    valueExpr.set(pattern.span.name, v);
    presenceExpr.set(pattern.span.name, `(${v}.length > 0)`);
    if (ctx.variant === 'raws' || offsetRefs.has(pattern.span.name)) {
      startOffExpr.set(pattern.span.name, `__${v}_start`);
      endOffExpr.set(pattern.span.name, `__${v}_end`);
    }
  }

  const lines: string[] = [];
  if (!allowRejectFallback) {
    lines.push(`if (${nextPosExpr} < 0) { ${target} = ${parseFnName(pattern.role, ctx.variant)}(state); } else {`);
  }
  lines.push(`const ${v} = captureTokenRange(state, ${firstIdxExpr}, ${endIdxExpr}, ${pattern.until.trim ? 'true' : 'false'});`);
  if (pattern.until.rejectSuffix) {
    lines.push(`if (${v}.endsWith(${jsString(pattern.until.rejectSuffix)})) {`);
    if (allowRejectFallback && rejectFallbackRole) {
      lines.push(`  state.pos = ${firstIdxExpr};`);
      lines.push(`  ${target} = ${parseFnName(rejectFallbackRole, ctx.variant)}(state);`);
    } else {
      lines.push(`  ${target} = ${parseFnName(pattern.role, ctx.variant)}(state);`);
    }
    lines.push(`} else {`);
  }
  if (pattern.span.name && (ctx.variant === 'raws' || offsetRefs.has(pattern.span.name))) {
    lines.push(`const __${v}_start = state.__lastCaptureStart;`);
    lines.push(`const __${v}_end = state.__lastCaptureEnd;`);
  }
  lines.push(`state.pos = ${nextPosExpr};`);
  lines.push(emitRoleContinuationAssignment(target, pattern, startIndex, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx));
  if (pattern.until.rejectSuffix) lines.push(`}`);
  if (!allowRejectFallback) lines.push(`}`);
  return lines.join('\n');
}

function emitRoleContinuationAssignment(
  target: string,
  pattern: LeadingCapturePattern,
  startIndex: number,
  valueExpr: ReadonlyMap<string, string>,
  presenceExpr: ReadonlyMap<string, string>,
  startOffExpr: ReadonlyMap<string, string>,
  endOffExpr: ReadonlyMap<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  if (pattern.productions.length === 1) {
    const body = emitFactoredBranch(
      pattern.productions[0]!,
      startIndex,
      valueExpr,
      presenceExpr,
      startOffExpr,
      endOffExpr,
      offsetRefs,
      ctx,
    );
    return `{ ${target} = (() => {
${indent(body, 1)}
})(); }`;
  }
  const info: NodeTypeInfo = { name: pattern.role, productions: pattern.productions };
  const body = emitFactoredContinuationBody(info, startIndex, valueExpr, presenceExpr, startOffExpr, endOffExpr, ctx);
  if (!body) return `${target} = ${parseFnName(pattern.role, ctx.variant)}(state);`;
  return `{ ${target} = (() => {
${indent(body, 1)}
})(); }`;
}

function emitFallbackDispatch(roles: ReadonlyArray<string>, ctx: Ctx, pad: string): string {
  if (roles.length === 2) {
    const first = untilThenLiteralForRole(roles[0]!, ctx);
    if (first) {
      if (first.rejectSuffix) {
        return `${pad}if (nextTopLevelStopId(state, ${stopIdArgs(first.stops, ctx)}) === ${literalTypeIdRef(first.literal, ctx)}) {
${pad}  const __first = trySpeculate(state, ${parseFnName(roles[0]!, ctx.variant)});
${pad}  if (__first !== null) return __first;
${pad}}
${pad}return ${parseFnName(roles[1]!, ctx.variant)}(state);`;
      }
      return `${pad}if (nextTopLevelStopId(state, ${stopIdArgs(first.stops, ctx)}) === ${literalTypeIdRef(first.literal, ctx)}) return ${parseFnName(roles[0]!, ctx.variant)}(state);
${pad}return ${parseFnName(roles[1]!, ctx.variant)}(state);`;
    }
  }
  return `${pad}return ${rolesDispatchCall(roles, ctx)};`;
}

// When a fallback list has exactly one role, emit a direct call. tryRoles
// otherwise allocates a single-element array literal on every dispatch — pure
// waste when there's no real disjunction to try. For multi-role fallbacks we
// still go through tryRoles so the speculation semantics are preserved.
function rolesDispatchCall(roles: ReadonlyArray<string>, ctx: Ctx): string {
  if (roles.length === 1) return `${parseFnName(roles[0]!, ctx.variant)}(state)`;
  return `tryRoles(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}])`;
}

function untilThenLiteralForRole(
  role: string,
  ctx: Ctx,
): { readonly stops: ReadonlyArray<string>; readonly literal: string; readonly rejectSuffix?: string } | null {
  const info = ctx.nodeTypes.get(role);
  if (!info || info.productions.length !== 1) return null;
  const [first, second] = info.productions[0]!.spans;
  const until = first ? findModifier(first.modifiers, 'until') : undefined;
  if (!until || !second || second.class !== 'literal' || !second.text) return null;
  if (!until.balanced || !until.stops.includes(second.text)) return null;
  return { stops: until.stops, literal: second.text, rejectSuffix: until.rejectSuffix };
}

// Three (id, value) pairs for captureUntil/scanTopLevelBoundary/etc. Each
// stop slot becomes \`<typeId>, "<value>"\` — empty string for single-literal
// types skips the value check at runtime.
function stopIdArgs(stops: ReadonlyArray<string>, ctx: Ctx): string {
  if (stops.length < 1 || stops.length > 3) {
    throw new Error(`emitter: lookahead supports 1-3 stop tokens, got ${stops.length}`);
  }
  return [stopIdValuePair(stops[0], ctx), stopIdValuePair(stops[1], ctx), stopIdValuePair(stops[2], ctx)].join(', ');
}

function stopIdValuePair(stopLiteral: string | undefined, ctx: Ctx): string {
  if (stopLiteral === undefined) return `${NO_TYPE_ID}, ""`;
  const typeName = ctx.literalTypeByText.get(stopLiteral) ?? stopLiteral;
  const id = typeIdRef(typeName, ctx);
  const valueArg = ctx.singleLiteralTypes.has(typeName) ? '""' : jsString(stopLiteral);
  return `${id}, ${valueArg}`;
}

function literalTypeIdRef(literal: string, ctx: Ctx): string {
  const typeName = ctx.literalTypeByText.get(literal) ?? literal;
  return typeIdRef(typeName, ctx);
}

function literalTypeIdValuePair(literal: string | undefined, ctx: Ctx): string {
  if (literal === undefined) return `${NO_TYPE_ID}, ""`;
  return stopIdValuePair(literal, ctx);
}

function firstTokenForRole(role: string, ctx: Ctx): FirstToken | null {
  const info = ctx.nodeTypes.get(role);
  if (!info || info.productions.length === 0) return null;

  let first: FirstToken | undefined;
  for (const production of info.productions) {
    const span = production.spans[0];
    const token = span ? firstTokenForSpan(span, ctx) : null;
    if (!token) return null;
    if (first === undefined) {
      first = token;
      continue;
    }
    if (!sameFirstToken(first, token)) return null;
  }
  return first ?? null;
}

function firstTokenForSpan(span: ResolvedSpan, ctx: Ctx): FirstToken | null {
  if (span.recursiveRoles.length > 0) return null;
  if (findModifier(span.modifiers, 'until') || findModifier(span.modifiers, 'repeats')) return null;
  if (findModifier(span.modifiers, 'rawUntil')) return null;
  if (hasModifier(span.modifiers, 'optional')) return null;
  if (span.class === 'literal') {
    if (!span.text) return null;
    return {
      kind: 'literal',
      type: ctx.literalTypeByText.get(span.text) ?? span.text,
      value: span.text,
    };
  }
  const values = oneOfValues(span);
  return values ? { kind: 'class', type: classToTokenType(span), values } : { kind: 'class', type: classToTokenType(span) };
}

function sameFirstToken(a: FirstToken, b: FirstToken): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'literal' && b.kind === 'literal') return a.type === b.type && a.value === b.value;
  if (a.kind === 'class' && b.kind === 'class') return a.type === b.type && (a.values ?? []).join('\0') === (b.values ?? []).join('\0');
  return false;
}

function firstTokenKey(first: FirstToken): string {
  return first.kind === 'literal'
    ? `${first.kind}:${first.type}:${first.value}`
    : `${first.kind}:${first.type}:${(first.values ?? []).join('\0')}`;
}

function firstTokenSpecificity(first: FirstToken): number {
  if (first.kind === 'literal') return 3;
  return first.values && first.values.length > 0 ? 2 : 1;
}

// `tokIdxExpr` is an index variable (or expression) pointing into state.types.
// If the index is out of range (>= state.count) the check returns false.
function emitFirstTokenCheck(
  tokIdxExpr: string,
  first: FirstToken,
  ctx: Ctx,
  lowerVar?: string,
): string {
  const typeId = typeIdRef(first.type, ctx);
  const inRange = `${tokIdxExpr} < state.count`;
  if (first.kind === 'literal') {
    const typeCheck = `${inRange} && state.types[${tokIdxExpr}] === ${typeId}`;
    if (ctx.singleLiteralTypes.has(first.type)) return typeCheck;
    return `${typeCheck} && tokenEquals(state, ${tokIdxExpr}, ${jsString(first.value)})`;
  }
  const base = `${inRange} && state.types[${tokIdxExpr}] === ${typeId}`;
  if (!first.values || first.values.length === 0) return base;
  const lowerExpr = lowerVar ?? `state.input.slice(state.starts[${tokIdxExpr}], state.ends[${tokIdxExpr}]).toLowerCase()`;
  return `${base} && (${oneOfCondition(lowerExpr, first.values)})`;
}

function oneOfValues(span: ResolvedSpan): readonly string[] | null {
  for (const refinement of span.refinements) {
    if (refinement.name !== 'oneOf') continue;
    const values = refinement.args?.[0];
    if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) continue;
    return values.map((value) => value.toLowerCase()).sort();
  }
  return null;
}

function oneOfCondition(valueExpr: string, values: readonly string[]): string {
  // valueExpr is the (already lowercased) lookup expression. Either the
  // caller passes a hoisted variable, or we fall back to inlining
  // .toLowerCase() here. The latter is the path emitSpanRefinementCheck
  // uses (one-shot oneOf refinement on a captured value).
  const lower = valueExpr.endsWith('.toLowerCase()') || valueExpr.includes('__lower')
    ? valueExpr
    : `${valueExpr}.toLowerCase()`;
  return values.map((value) => `${lower} === ${jsString(value)}`).join(' || ') || 'false';
}

function stopPredicateFor(next: ResolvedSpan | undefined, ctx: Ctx): string {
  if (!next) return 'state.pos >= state.count';
  if (next.class === 'literal' && next.text) {
    const type = ctx.literalTypeByText.get(next.text) ?? next.text;
    return peekLiteralCall(type, next.text, ctx);
  }
  return 'state.pos >= state.count';
}

function enforceMin(listVar: string, min: number, role: string): string {
  if (min <= 0) return '';
  return `\nif (${listVar}.length < ${min}) throw new SyntaxError(${jsString(`expected at least ${min} ${role}`)});`;
}

function enforceMax(listVar: string, max: number | undefined, role: string): string {
  if (max === undefined) return '';
  return `\nif (${listVar}.length > ${max}) throw new SyntaxError(${jsString(`expected at most ${max} ${role}`)});`;
}

function findModifier<K extends SpanModifier['kind']>(
  modifiers: ReadonlyArray<SpanModifier>,
  kind: K,
): Extract<SpanModifier, { kind: K }> | undefined {
  for (const m of modifiers) if (m.kind === kind) return m as Extract<SpanModifier, { kind: K }>;
  return undefined;
}

function hasModifier(modifiers: ReadonlyArray<SpanModifier>, kind: SpanModifier['kind']): boolean {
  return modifiers.some((m) => m.kind === kind);
}

function classToTokenType(span: ResolvedSpan): string {
  return span.class;
}

export function parseFnName(nodeType: string, variant: ParseVariant = 'raws'): string {
  const base = `parse${jsIdent(nodeType)}`;
  if (variant === 'validate') return `validate${jsIdent(nodeType)}`;
  return variant === 'fast' ? `${base}Fast` : base;
}

function continuationFnName(nodeType: string, variant: ParseVariant): string {
  return `${parseFnName(nodeType, variant)}__fromLeadingCapture`;
}

function indent(s: string, level = 1): string {
  const pad = '  '.repeat(level);
  return s.split('\n').map((l) => (l ? pad + l : l)).join('\n');
}
