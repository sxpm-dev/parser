import type { SpanModifier } from '@parser2/parser';
import type { InferredSchema, NodeTypeInfo, Production, ResolvedSpan } from '../model.ts';
import { jsIdent, jsString } from './strings.ts';
import { emitStructureExpr } from './structure.ts';

// Emits one parseXxx(state) function per node type. The smoke-test slice has
// one production per node type so we can take the direct path; multi-
// production dispatch (with first-token lookahead) is a follow-on.

type Ctx = {
  readonly literalTypeByText: ReadonlyMap<string, string>;
  readonly nodeTypes: ReadonlyMap<string, NodeTypeInfo>;
};

export function emitNodeFunctions(schema: InferredSchema): string {
  const ctx: Ctx = { literalTypeByText: schema.literalTypeByText, nodeTypes: schema.nodeTypes };
  const parts: string[] = [];
  for (const info of schema.nodeTypes.values()) {
    parts.push(emitNodeFunction(info, ctx));
  }
  return parts.join('\n\n');
}

function emitNodeFunction(info: NodeTypeInfo, ctx: Ctx): string {
  if (info.productions.length === 1) {
    const body = emitProductionBody(info.productions[0]!, ctx);
    return `function ${parseFnName(info.name)}(state: State): unknown {
${indent(body, 1)}
}`;
  }
  // Multi-production: emit each production as its own __alt function and a
  // dispatch wrapper that speculatively tries each. The last attempt runs
  // directly so its error propagates.
  const altFns = info.productions.map((production, i) => {
    const body = emitProductionBody(production, ctx);
    return `function ${parseFnName(info.name)}__alt${i}(state: State): unknown {
${indent(body, 1)}
}`;
  }).join('\n\n');
  const lookaheadDispatch = emitProductionLookaheadDispatch(info);
  if (lookaheadDispatch) return `${altFns}\n\n${lookaheadDispatch}`;
  const speculativeAttempts = info.productions.slice(0, -1).map((_, i) =>
    `  { const r = trySpeculate(state, ${parseFnName(info.name)}__alt${i}); if (r !== null) return r; }`,
  ).join('\n');
  const lastIdx = info.productions.length - 1;
  const dispatch = `function ${parseFnName(info.name)}(state: State): unknown {
${speculativeAttempts}
  return ${parseFnName(info.name)}__alt${lastIdx}(state);
}`;
  return `${altFns}\n\n${dispatch}`;
}

function emitProductionLookaheadDispatch(info: NodeTypeInfo): string | null {
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
    const dispatch = `function ${parseFnName(info.name)}(state: State): unknown {
  if (nextTopLevelStop(state, ${stopArgs(stops)}) === ${jsString(uniqueStops[0]!)}) {
    const r = trySpeculate(state, ${parseFnName(info.name)}__alt0);
    if (r !== null) return r;
  }
  return ${parseFnName(info.name)}__alt1(state);
}`;
    return dispatch;
  }
  return null;
}

function emitProductionBody(production: Production, ctx: Ctx): string {
  const lines: string[] = [];
  const valueExpr = new Map<string, string>();
  const presenceExpr = new Map<string, string>();
  const startOffExpr = new Map<string, string>();
  const endOffExpr = new Map<string, string>();
  const spans = production.spans;

  // Capture node-start before any spans are consumed.
  lines.push(`const __startTok = state.tokens[state.pos];`);
  lines.push(`const __startOff = __startTok ? __startTok.start : state.input.length;`);

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    const next = spans[i + 1];
    lines.push(emitSpan(span, next, valueExpr, presenceExpr, startOffExpr, endOffExpr, ctx));
  }

  // After all spans, compute end from the last consumed token.
  lines.push(`const __lastTok = state.tokens[state.pos - 1];`);
  lines.push(`const __endOff = __lastTok ? __lastTok.end : __startOff;`);

  const bindings = {
    valueExpr, presenceExpr, startOffExpr, endOffExpr,
  };
  const structure = emitStructureExpr(production.structure, bindings);
  const fastStructure = emitStructureExpr(production.structure, bindings, { omitRaws: true });
  // Auto-attach source: { start, end }. The structure literal can't override
  // source — auto-attached after construction.
  lines.push(`const __struct: Record<string, unknown> = state.mode === 'raws' ? ${structure} : ${fastStructure};`);
  lines.push(`if (state.mode === 'raws') __struct.source = makeSource(state, __startOff, __endOff);`);
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
  ctx: Ctx,
): string {
  const optional = hasModifier(span.modifiers, 'optional');
  const repeats = findModifier(span.modifiers, 'repeats');
  const until = findModifier(span.modifiers, 'until');

  if (until) {
    return emitUntilSpan(span, until, valueExpr, presenceExpr, startOffExpr, endOffExpr);
  }
  if (repeats) {
    return emitRepeatedSpan(span, repeats, next, valueExpr, presenceExpr, startOffExpr, endOffExpr, ctx);
  }
  if (span.recursiveRoles.length > 0) {
    return emitRecursiveSpan(span, valueExpr, presenceExpr, optional);
  }
  if (span.class === 'literal') {
    return emitLiteralSpan(span, valueExpr, presenceExpr, startOffExpr, endOffExpr, optional, ctx);
  }
  return emitClassedSpan(span, valueExpr, presenceExpr, startOffExpr, endOffExpr, optional);
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
    valueExpr.set(span.name, v);
    presenceExpr.set(span.name, `(${v}.length > 0)`);
    startOffExpr.set(span.name, `__${v}_start`);
    endOffExpr.set(span.name, `__${v}_end`);
    if (rejectCheck) {
      return `const __captured = ${captureCall};
${rejectCheck}const ${v} = __captured;
const __${v}_start = state.__lastCaptureStart;
const __${v}_end = state.__lastCaptureEnd;`;
    }
    return `const ${v} = ${captureCall};
const __${v}_start = state.__lastCaptureStart;
const __${v}_end = state.__lastCaptureEnd;`;
  }
  if (rejectCheck) {
    return `{ const __captured = ${captureCall}; ${rejectCheck.trim()} }`;
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
  ctx: Ctx,
): string {
  if (!span.text) throw new Error('emitter: literal span has no text');
  const type = ctx.literalTypeByText.get(span.text) ?? span.text;
  const typeExpr = jsString(type);
  const valueLit = jsString(span.text);
  if (span.name) {
    const v = jsIdent(span.name);
    valueExpr.set(span.name, v);
    startOffExpr.set(span.name, `__${v}_start`);
    endOffExpr.set(span.name, `__${v}_end`);
    if (optional) {
      presenceExpr.set(span.name, `(${v} !== null)`);
      return `const ${v} = consumeOptionalLiteral(state, ${typeExpr}, ${valueLit});
${emitOneTokenOffsets(v, true)}`;
    }
    return `const ${v} = expectLiteral(state, ${typeExpr}, ${valueLit});
${emitOneTokenOffsets(v, false)}`;
  }
  if (optional) return `consumeOptionalLiteral(state, ${typeExpr}, ${valueLit});`;
  return `expectLiteral(state, ${typeExpr}, ${valueLit});`;
}

function emitClassedSpan(
  span: ResolvedSpan,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  optional: boolean,
): string {
  const typeName = classToTokenType(span);
  // Comment captures store the trimmed interior (no /* */), matching the
  // PostCSS `text` convention. Apply this transformation at the call site
  // rather than mutating the token's value so other consumers still see
  // the raw source slice if needed.
  const isComment = span.class === 'comment';
  if (span.name) {
    const v = jsIdent(span.name);
    valueExpr.set(span.name, v);
    startOffExpr.set(span.name, `__${v}_start`);
    endOffExpr.set(span.name, `__${v}_end`);
    if (optional) {
      presenceExpr.set(span.name, `(${v} !== null)`);
      const call = `consumeOptionalClass(state, ${jsString(typeName)})`;
      if (isComment) {
        return `const __raw_${v} = ${call};
const ${v} = __raw_${v} === null ? null : commentInterior(__raw_${v});
const __${v}_start = __raw_${v} !== null ? state.tokens[state.pos - 1].start : (state.tokens[state.pos - 1]?.end ?? 0);
const __${v}_end = __raw_${v} !== null ? state.tokens[state.pos - 1].end : __${v}_start;`;
      }
      return `const ${v} = ${call};
${emitOneTokenOffsets(v, true)}`;
    }
    const call = `expectClass(state, ${jsString(typeName)})`;
    if (isComment) {
      return `const __raw_${v} = ${call};
const ${v} = commentInterior(__raw_${v});
const __${v}_start = state.tokens[state.pos - 1].start;
const __${v}_end = state.tokens[state.pos - 1].end;`;
    }
    return `const ${v} = ${call};
${emitOneTokenOffsets(v, false)}`;
  }
  if (optional) return `consumeOptionalClass(state, ${jsString(typeName)});`;
  return `expectClass(state, ${jsString(typeName)});`;
}

function emitRecursiveSpan(
  span: ResolvedSpan,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  optional: boolean,
): string {
  const roles = span.recursiveRoles;
  const callExpr = roles.length === 1
    ? `${parseFnName(roles[0]!)}(state)`
    : `tryRoles(state, [${roles.map((r) => parseFnName(r)).join(', ')}])`;
  if (span.name) {
    const v = jsIdent(span.name);
    valueExpr.set(span.name, v);
    if (optional) {
      const speculative = roles.length === 1
        ? `trySpeculate(state, ${parseFnName(roles[0]!)})`
        : `tryRolesOrNull(state, [${roles.map((r) => parseFnName(r)).join(', ')}])`;
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
  ctx: Ctx,
): string {
  if (span.recursiveRoles.length === 0) {
    throw new Error(`emitter v1: .repeats() on non-recursive span is not implemented`);
  }
  const roles = span.recursiveRoles;
  const parseExpr = roles.length === 1
    ? `${parseFnName(roles[0]!)}(state)`
    : emitRoleDispatchExpr(roles, ctx);
  const listVar = span.name ? jsIdent(span.name) : '_repeated';
  if (span.name) {
    valueExpr.set(span.name, listVar);
    presenceExpr.set(span.name, `(${listVar}.length > 0)`);
    // start = end of the previously consumed token (the body's opening
    // literal, e.g. '{', or 0 for the root container). end = __prevEnd,
    // which the body loop maintains as it consumes children.
    startOffExpr.set(span.name, `__${listVar}_startOff`);
    endOffExpr.set(span.name, `__prevEnd_${listVar}`);
  }

  const stopPredicate = stopPredicateFor(next, ctx);
  const sep = repeats.sep;
  const trailing = repeats.trailing ?? 'forbidden';
  const min = repeats.min ?? 0;
  const minCheck = enforceMin(listVar, min, roles.join('|'));

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
  const attachBefore = `if (state.mode === 'raws') attachRawsBefore(state, __child, __prevEnd_${listVar});`;
  const updatePrevEnd = `if (state.mode === 'raws') __prevEnd_${listVar} = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_${listVar};`;

  if (!sep) {
    return `const __${listVar}_startOff = state.tokens[state.pos - 1]?.end ?? 0;
const ${listVar}: unknown[] = [];
let __prevEnd_${listVar} = __${listVar}_startOff;
while (!(${stopPredicate})) {
  const __before = state.pos;
  const __child = ${parseExpr};
  ${attachBefore}
  ${listVar}.push(__child);
  if (state.pos === __before) break;
  ${updatePrevEnd}
}${minCheck}`;
  }

  const sepType = ctx.literalTypeByText.get(sep) ?? sep;
  const sepTypeExpr = jsString(sepType);
  const sepValueLit = jsString(sep);

  // Separator is OPTIONAL between children — consume when present, but don't
  // require it. This lets a single repeats group mix children that naturally
  // need a separator (declarations: `prop: val;`) with children that don't
  // (rules: `.foo {}`, at-rules with their own terminator).
  return `const __${listVar}_startOff = state.tokens[state.pos - 1]?.end ?? 0;
const ${listVar}: unknown[] = [];
let __prevEnd_${listVar} = __${listVar}_startOff;
while (!(${stopPredicate})) {
  // Tolerate stray leading separators (e.g. \`a {;; color: red }\`).
  // The separators are silently consumed; they're recoverable as raws
  // because raws.before for the next child is computed against
  // __prevEnd_${listVar} (which doesn't advance during this skip).
  while (peekLiteral(state, ${sepTypeExpr}, ${sepValueLit})) {
    expectLiteral(state, ${sepTypeExpr}, ${sepValueLit});
  }
  if (${stopPredicate}) break;
  const __before = state.pos;
  const __child = ${parseExpr};
  ${attachBefore}
  ${listVar}.push(__child);
  if (state.pos === __before) break;
  ${updatePrevEnd}
  while (peekLiteral(state, ${sepTypeExpr}, ${sepValueLit})) {
    expectLiteral(state, ${sepTypeExpr}, ${sepValueLit});
  }
}${minCheck}`;
}

type FirstToken =
  | { readonly kind: 'literal'; readonly type: string; readonly value: string }
  | { readonly kind: 'class'; readonly type: string };

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
    const key = first.kind === 'literal'
      ? `${first.kind}:${first.type}:${first.value}`
      : `${first.kind}:${first.type}`;
    if (seenKeys.has(key)) {
      fallback.push(role);
      continue;
    }
    seenKeys.add(key);
    keyed.push(role);
  }

  if (keyed.length === 0) {
    return `tryRoles(state, [${roles.map((r) => parseFnName(r)).join(', ')}])`;
  }

  const lines: string[] = [];
  lines.push(`(() => {`);
  lines.push(`  const __tok = state.tokens[state.pos];`);
  for (const role of keyed) {
    const first = firstTokenForRole(role, ctx)!;
    const check = first.kind === 'literal'
      ? `__tok !== undefined && __tok.type === ${jsString(first.type)} && __tok.value === ${jsString(first.value)}`
      : `__tok !== undefined && __tok.type === ${jsString(first.type)}`;
    lines.push(`  if (${check}) return ${parseFnName(role)}(state);`);
  }
  const fallbackRoles = [...fallback, ...roles.filter((role) => !keyed.includes(role) && !fallback.includes(role))];
  const fallbackDispatch = emitFallbackDispatch(fallbackRoles, ctx, '  ');
  lines.push(fallbackDispatch);
  lines.push(`})()`);
  return lines.join('\n');
}

function emitFallbackDispatch(roles: ReadonlyArray<string>, ctx: Ctx, pad: string): string {
  if (roles.length === 2) {
    const first = untilThenLiteralForRole(roles[0]!, ctx);
    if (first) {
      if (first.rejectSuffix) {
        return `${pad}if (nextTopLevelStop(state, ${stopArgs(first.stops)}) === ${jsString(first.literal)}) {
${pad}  const __first = trySpeculate(state, ${parseFnName(roles[0]!)});
${pad}  if (__first !== null) return __first;
${pad}}
${pad}return ${parseFnName(roles[1]!)}(state);`;
      }
      return `${pad}if (nextTopLevelStop(state, ${stopArgs(first.stops)}) === ${jsString(first.literal)}) return ${parseFnName(roles[0]!)}(state);
${pad}return ${parseFnName(roles[1]!)}(state);`;
    }
  }
  return `${pad}return tryRoles(state, [${roles.map((r) => parseFnName(r)).join(', ')}]);`;
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
  if (hasModifier(span.modifiers, 'optional')) return null;
  if (span.class === 'literal') {
    if (!span.text) return null;
    return {
      kind: 'literal',
      type: ctx.literalTypeByText.get(span.text) ?? span.text,
      value: span.text,
    };
  }
  return { kind: 'class', type: classToTokenType(span) };
}

function sameFirstToken(a: FirstToken, b: FirstToken): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'literal' && b.kind === 'literal') return a.type === b.type && a.value === b.value;
  if (a.kind === 'class' && b.kind === 'class') return a.type === b.type;
  return false;
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

export function parseFnName(nodeType: string): string {
  return `parse${jsIdent(nodeType)}`;
}

function indent(s: string, level = 1): string {
  const pad = '  '.repeat(level);
  return s.split('\n').map((l) => (l ? pad + l : l)).join('\n');
}
