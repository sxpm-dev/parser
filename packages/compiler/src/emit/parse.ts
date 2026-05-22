import type { SpanModifier } from '@parser2/parser';
import type { InferredSchema, NodeTypeInfo, Production, ResolvedSpan } from '../model.ts';
import { jsIdent, jsString } from './strings.ts';
import { collectOffsetRefs, emitStructureExpr } from './structure.ts';

// Emits one parseXxx(state) function per node type. The smoke-test slice has
// one production per node type so we can take the direct path; multi-
// production dispatch (with first-token lookahead) is a follow-on.

type Ctx = {
  readonly literalTypeByText: ReadonlyMap<string, string>;
  readonly nodeTypes: ReadonlyMap<string, NodeTypeInfo>;
  readonly variant: ParseVariant;
  readonly capturedDispatch?: boolean;
};

type ParseVariant = 'fast' | 'raws' | 'validate';

export function emitNodeFunctions(schema: InferredSchema): string {
  const parts: string[] = [];
  for (const variant of ['raws', 'fast', 'validate'] as const) {
    const ctx: Ctx = { literalTypeByText: schema.literalTypeByText, nodeTypes: schema.nodeTypes, variant };
    for (const info of schema.nodeTypes.values()) {
      parts.push(emitNodeFunction(info, ctx));
      const continuation = emitLeadingCaptureContinuationFunction(info, ctx);
      if (continuation) parts.push(continuation);
    }
  }
  return parts.join('\n\n');
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

function emitNodeFunction(info: NodeTypeInfo, ctx: Ctx): string {
  const fnName = parseFnName(info.name, ctx.variant);
  if (info.productions.length === 1) {
    const body = emitProductionBody(info.productions[0]!, ctx);
    return `function ${fnName}(state: State): unknown {
${indent(body, 1)}
}`;
  }
  // Multi-production: emit each production as its own __alt function and a
  // dispatch wrapper that speculatively tries each. The last attempt runs
  // directly so its error propagates.
  const factored = emitFactoredTwoProductionFunction(info, ctx);
  if (factored) return factored;
  const altFns = info.productions.map((production, i) => {
    const body = emitProductionBody(production, ctx);
    return `function ${fnName}__alt${i}(state: State): unknown {
${indent(body, 1)}
}`;
  }).join('\n\n');
  const lookaheadDispatch = emitProductionLookaheadDispatch(info, ctx);
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

function emitFactoredTwoProductionFunction(info: NodeTypeInfo, ctx: Ctx): string | null {
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
    lines.push(`const __startTok = state.tokens[state.pos];`);
    lines.push(`const __startOff = __startTok ? __startTok.start : state.input.length;`);
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
  lines.push(`if (peekLiteralAfterComments(state, ${jsString(branchType)}, ${jsString(firstBranchLiteral.text)})) {
${indent(firstBranch, 1)}
}`);
  lines.push(secondBranch);

  return `function ${parseFnName(info.name, ctx.variant)}(state: State): unknown {
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
    lines.push(`const __lastTok = state.tokens[state.pos - 1];`);
    lines.push(`const __endOff = __lastTok ? __lastTok.end : __startOff;`);
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
  lines.push(`if (peekLiteralAfterComments(state, ${jsString(branchType)}, ${jsString(firstBranchLiteral.text)})) {
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

function emitProductionLookaheadDispatch(info: NodeTypeInfo, ctx: Ctx): string | null {
  const grouped = emitFirstTokenProductionDispatch(info, ctx);
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
    const fnName = parseFnName(info.name, ctx.variant);
    const dispatch = `function ${fnName}(state: State): unknown {
  if (nextTopLevelStop(state, ${stopArgs(stops)}) === ${jsString(uniqueStops[0]!)}) {
    const r = trySpeculate(state, ${fnName}__alt0);
    if (r !== null) return r;
  }
  return ${fnName}__alt1(state);
}`;
    return dispatch;
  }
  return null;
}

function emitFirstTokenProductionDispatch(info: NodeTypeInfo, ctx: Ctx): string | null {
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

  const fnName = parseFnName(info.name, ctx.variant);
  const lines: string[] = [];
  lines.push(`function ${fnName}(state: State): unknown {`);
  lines.push(`  const __tok = state.tokens[state.pos];`);
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    const first = group.first.kind === 'class' ? { kind: 'class' as const, type: group.first.type } : group.first;
    const check = emitFirstTokenCheck('__tok', first);
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
    lines.push(`const __startTok = state.tokens[state.pos];`);
    lines.push(`const __startOff = __startTok ? __startTok.start : state.input.length;`);
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
  lines.push(`if (peekLiteral(state, ${jsString(firstType)}, ${jsString(firstLiteral.text)})) {
${indent(firstBranch, 1)}
}`);
  lines.push(`if (peekLiteral(state, ${jsString(secondType)}, ${jsString(secondLiteral.text)})) {
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
    return `peekLiteral(state, ${jsString(type)}, ${jsString(stop.text)})`;
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
      : `__prevEnd_${listVar} = state.tokens[state.pos - 1]?.end ?? __prevEnd_${listVar};`
    : '';
  const offsetDecls = needsOffsets
    ? `const __${listVar}_startOff = state.tokens[state.pos - 1]?.end ?? 0;
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

  const tokVar = `__tok${spanIndex}`;
  const lines: string[] = [];
  lines.push(`const ${tokVar} = nthNonCommentToken(state, state.pos, ${spanIndex});`);

  // Hoist `__tokN.value.toLowerCase()` once when at least one branch needs
  // it. Without this every if/else branch re-runs toLowerCase on the same
  // value — fine semantically, but hot dispatchers (HTML, CSS) call it
  // thousands of times per parse. The lower-cased value is also reused by
  // emitFirstTokenCheck via the lowerVar shortcut below.
  const needsLower = groups.some(
    (g) => g.token.kind === 'class' && g.token.values && g.token.values.length > 0,
  );
  const lowerVar = needsLower ? `${tokVar}__lower` : undefined;
  if (lowerVar) {
    lines.push(`const ${lowerVar} = ${tokVar} !== undefined ? ${tokVar}.value.toLowerCase() : undefined;`);
  }

  groups.forEach((group, i) => {
    const check = emitFirstTokenCheck(tokVar, group.token, lowerVar);
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

function emitProductionBody(production: Production, ctx: Ctx): string {
  const lines: string[] = [];
  const valueExpr = new Map<string, string>();
  const presenceExpr = new Map<string, string>();
  const startOffExpr = new Map<string, string>();
  const endOffExpr = new Map<string, string>();
  const spans = production.spans;
  const structureOptions = ctx.variant === 'fast' || ctx.variant === 'validate' ? { omitRaws: true } : {};
  const offsetRefs = collectOffsetRefs(production.structure, structureOptions);
  const needsNodeRange = ctx.variant === 'raws';

  // Capture node-start before any spans are consumed.
  if (needsNodeRange) {
    lines.push(`const __startTok = state.tokens[state.pos];`);
    lines.push(`const __startOff = __startTok ? __startTok.start : state.input.length;`);
  }

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    const next = spans[i + 1];
    lines.push(emitSpan(span, next, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx));
  }

  // After all spans, compute end from the last consumed token.
  if (needsNodeRange) {
    lines.push(`const __lastTok = state.tokens[state.pos - 1];`);
    lines.push(`const __endOff = __lastTok ? __lastTok.end : __startOff;`);
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
  return emitClassedSpan(span, valueExpr, presenceExpr, startOffExpr, endOffExpr, optional, noWhitespaceAfter, offsetRefs, ctx);
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
    return `const ${startVar} = ${name} !== null ? state.tokens[state.pos - 1].start : (state.tokens[state.pos - 1]?.end ?? 0);
const ${endVar} = ${name} !== null ? state.tokens[state.pos - 1].end : ${startVar};`;
  }
  return `const ${startVar} = state.tokens[state.pos - 1].start;
const ${endVar} = state.tokens[state.pos - 1].end;`;
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
  const stopsArgs = stopArgs(until.stops);
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
  const conds = stopBefore
    .filter((s) => s.length > 0)
    .map((s) => `state.input.startsWith(${jsString(s)}, __off)`)
    .join(' || ');
  if (!conds) return '';
  return `{ const __off = state.tokens[state.pos]?.start ?? state.input.length; if (${conds}) break; }`;
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
  const typeExpr = jsString(type);
  const valueLit = jsString(span.text);
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
      return `const ${v} = consumeOptionalLiteral(state, ${typeExpr}, ${valueLit});
${optionalAdjacencyCheck.trimStart()}
${needsOffsets ? emitOneTokenOffsets(v, true) : ''}`;
    }
    return `const ${v} = expectLiteral(state, ${typeExpr}, ${valueLit});${adjacencyCheck}${needsOffsets ? `\n${emitOneTokenOffsets(v, false)}` : ''}`;
  }
  if (optional) return noWhitespaceAfter
    ? `{ const __optional = consumeOptionalLiteral(state, ${typeExpr}, ${valueLit}); if (__optional !== null) requireNoWhitespaceAfterLastToken(state); }`
    : `consumeOptionalLiteral(state, ${typeExpr}, ${valueLit});`;
  return `expectLiteral(state, ${typeExpr}, ${valueLit});${adjacencyCheck}`;
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
): string {
  const typeName = classToTokenType(span);
  const adjacencyCheck = noWhitespaceAfter ? '\nrequireNoWhitespaceAfterLastToken(state);' : '';
  // Comment captures store the trimmed interior (no /* */), matching the
  // PostCSS `text` convention. Apply this transformation at the call site
  // rather than mutating the token's value so other consumers still see
  // the raw source slice if needed.
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
      const call = `consumeOptionalClass(state, ${jsString(typeName)})`;
      const refinementCheck = emitSpanRefinementCheck(span, v, true, 'state.tokens[state.pos - 1].start');
      if (isComment) {
        const optionalCommentAdjacencyCheck = noWhitespaceAfter ? `\nif (__raw_${v} !== null) requireNoWhitespaceAfterLastToken(state);` : '';
        return `const __raw_${v} = ${call};
const ${v} = __raw_${v} === null ? null : commentInterior(__raw_${v});
${optionalCommentAdjacencyCheck.trimStart()}
${refinementCheck}${needsOffsets ? `
const __${v}_start = __raw_${v} !== null ? state.tokens[state.pos - 1].start : (state.tokens[state.pos - 1]?.end ?? 0);
const __${v}_end = __raw_${v} !== null ? state.tokens[state.pos - 1].end : __${v}_start;` : ''}`;
      }
      const optionalAdjacencyCheck = noWhitespaceAfter ? `\nif (${v} !== null) requireNoWhitespaceAfterLastToken(state);` : '';
      return `const ${v} = ${call};
${optionalAdjacencyCheck.trimStart()}
${refinementCheck}
${needsOffsets ? emitOneTokenOffsets(v, true) : ''}`;
    }
    const call = `expectClass(state, ${jsString(typeName)})`;
    const refinementCheck = emitSpanRefinementCheck(span, v, false, 'state.tokens[state.pos - 1].start');
    if (isComment) {
      return `const __raw_${v} = ${call};
const ${v} = commentInterior(__raw_${v});
${adjacencyCheck}${refinementCheck}${needsOffsets ? `
const __${v}_start = state.tokens[state.pos - 1].start;
const __${v}_end = state.tokens[state.pos - 1].end;` : ''}`;
    }
    return `const ${v} = ${call};
${adjacencyCheck}${refinementCheck}${needsOffsets ? `\n${emitOneTokenOffsets(v, false)}` : ''}`;
  }
  if (optional) return noWhitespaceAfter
    ? `{ const __optional = consumeOptionalClass(state, ${jsString(typeName)}); if (__optional !== null) requireNoWhitespaceAfterLastToken(state); }`
    : `consumeOptionalClass(state, ${jsString(typeName)});`;
  return `expectClass(state, ${jsString(typeName)});${adjacencyCheck}`;
}

function emitSpanRefinementCheck(span: ResolvedSpan, valueVar: string, optional: boolean, positionExpr: string): string {
  const checks: string[] = [];
  for (const refinement of span.refinements) {
    if (refinement.name === 'oneOf') {
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
    const sepTypeExpr = jsString(sepType);
    const sepValueLit = jsString(sep);
    return `let __count_${listVar} = 0;
while (!(${stopPredicate})) {
  while (peekLiteral(state, ${sepTypeExpr}, ${sepValueLit})) {
    expectLiteral(state, ${sepTypeExpr}, ${sepValueLit});
  }
  if (${stopPredicate}) break;
  const __before = state.pos;
  ${validateChildCall}
  __count_${listVar}++;
  if (state.pos === __before) break;
  while (peekLiteral(state, ${sepTypeExpr}, ${sepValueLit})) {
    expectLiteral(state, ${sepTypeExpr}, ${sepValueLit});
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
      : `__prevEnd_${listVar} = state.tokens[state.pos - 1]?.end ?? __prevEnd_${listVar};`
    : '';
  const offsetDecls = needsOffsets
    ? `const __${listVar}_startOff = state.tokens[state.pos - 1]?.end ?? 0;
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
  const sepTypeExpr = jsString(sepType);
  const sepValueLit = jsString(sep);

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
  while (peekLiteral(state, ${sepTypeExpr}, ${sepValueLit})) {
    expectLiteral(state, ${sepTypeExpr}, ${sepValueLit});
  }
  if (${stopPredicate}) break;
  const __before = state.pos;
  ${childDecl}
${attachLine}  ${listVar}.push(__child);
  if (state.pos === __before) break;
${updateLine}  while (peekLiteral(state, ${sepTypeExpr}, ${sepValueLit})) {
    expectLiteral(state, ${sepTypeExpr}, ${sepValueLit});
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
    return `tryRoles(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}])`;
  }
  keyed.sort((a, b) => firstTokenSpecificity(firstTokenForRole(b, ctx)!) - firstTokenSpecificity(firstTokenForRole(a, ctx)!));

  const lines: string[] = [];
  lines.push(`(() => {`);
  lines.push(`  const __tok = state.tokens[state.pos];`);
  for (const role of keyed) {
    const first = firstTokenForRole(role, ctx)!;
    const check = emitFirstTokenCheck('__tok', first);
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
    lines.push(`const __tok = state.tokens[state.pos];`);
    keyed.forEach((role, i) => {
      const first = firstTokenForRole(role, ctx)!;
      const check = emitFirstTokenCheck('__tok', first);
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
        return `if (nextTopLevelStop(state, ${stopArgs(first.stops)}) === ${jsString(first.literal)}) {
  const __first = trySpeculate(state, ${firstFn});
  ${target} = __first !== null ? __first : ${secondFn}(state);
} else {
  ${target} = ${secondFn}(state);
}`;
      }
      return `if (nextTopLevelStop(state, ${stopArgs(first.stops)}) === ${jsString(first.literal)}) {
  ${target} = ${firstFn}(state);
} else {
  ${target} = ${secondFn}(state);
}`;
    }
  }
  return `${target} = tryRoles(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}]);`;
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
  const secondaryWatch = secondaryValueBranch ? jsString(secondaryValueBranch.literal) : 'null';
  lines.push(`const __scan = scanTopLevelBoundary(state, ${stopArgs(primary.until.stops)}, ${jsString(secondary.literal)}, ${secondaryWatch});`);
  lines.push(`if (__scan.stop === ${jsString(primary.literal)}) {`);
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
        return `${pad}if (nextTopLevelStop(state, ${stopArgs(first.stops)}) === ${jsString(first.literal)}) {
${pad}  const __first = trySpeculate(state, ${parseFnName(roles[0]!, ctx.variant)});
${pad}  if (__first !== null) return __first;
${pad}}
${pad}return ${parseFnName(roles[1]!, ctx.variant)}(state);`;
      }
      return `${pad}if (nextTopLevelStop(state, ${stopArgs(first.stops)}) === ${jsString(first.literal)}) return ${parseFnName(roles[0]!, ctx.variant)}(state);
${pad}return ${parseFnName(roles[1]!, ctx.variant)}(state);`;
    }
  }
  return `${pad}return tryRoles(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}]);`;
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

function stopArgs(stops: ReadonlyArray<string>): string {
  if (stops.length < 1 || stops.length > 3) {
    throw new Error(`emitter: lookahead supports 1-3 stop tokens, got ${stops.length}`);
  }
  return [
    jsString(stops[0]!),
    jsString(stops[1] ?? null),
    jsString(stops[2] ?? null),
  ].join(', ');
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

function emitFirstTokenCheck(
  tokenExpr: string,
  first: FirstToken,
  lowerVar?: string,
): string {
  if (first.kind === 'literal') {
    return `${tokenExpr} !== undefined && ${tokenExpr}.type === ${jsString(first.type)} && ${tokenExpr}.value === ${jsString(first.value)}`;
  }
  const base = `${tokenExpr} !== undefined && ${tokenExpr}.type === ${jsString(first.type)}`;
  if (!first.values || first.values.length === 0) return base;
  // If the caller hoisted `tokenExpr.value.toLowerCase()` once, reuse it
  // instead of recomputing toLowerCase in each branch of a long dispatch.
  const lowerExpr = lowerVar ?? `${tokenExpr}.value.toLowerCase()`;
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
  if (!next) return 'state.pos >= state.tokens.length';
  if (next.class === 'literal' && next.text) {
    const type = ctx.literalTypeByText.get(next.text) ?? next.text;
    return `peekLiteral(state, ${jsString(type)}, ${jsString(next.text)})`;
  }
  return 'state.pos >= state.tokens.length';
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
