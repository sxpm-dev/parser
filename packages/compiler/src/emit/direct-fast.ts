import { isStructureRef, type StructureValue } from '@parser2/parser';
import type { InferredSchema, NodeTypeInfo, ResolvedSpan } from '../model.ts';
import { jsString } from './strings.ts';

export function emitDirectFastPath(schema: InferredSchema): string | null {
  const shape = inferNestedBlockFastShape(schema);
  if (!shape) return null;
  return emitNestedBlockFastPath(shape);
}

type FastShape = {
  readonly root: ObjectShape & { readonly childrenKey: string };
  readonly comment: ObjectShape & { readonly textKey: string };
  readonly block: ObjectShape & { readonly captureKey: string; readonly childrenKey: string };
  readonly pair: ObjectShape & { readonly leftKey: string; readonly rightKey: string; readonly flagKey: string | null };
  readonly prefixed: ObjectShape & { readonly nameKey: string; readonly paramsKey: string; readonly childrenKey: string };
  readonly literals: {
    readonly open: string;
    readonly close: string;
    readonly pair: string;
    readonly separator: string;
    readonly prefix: string;
    readonly flag: string | null;
  };
};

type BlockShape = FastShape['block'] & {
  readonly openLiteral: string;
  readonly closeLiteral: string;
};

type PairShape = FastShape['pair'] & {
  readonly pairLiteral: string;
  readonly flagLiteral: string | null;
};

type PrefixedShape = FastShape['prefixed'] & {
  readonly prefixLiteral: string;
};

type ObjectShape = {
  readonly typeKey: string | null;
  readonly typeValue: string | null;
};

function inferNestedBlockFastShape(schema: InferredSchema): FastShape | null {
  const rootInfo = schema.nodeTypes.get(schema.rootType);
  const rootProduction = rootInfo?.productions.length === 1 ? rootInfo.productions[0] : undefined;
  const rootRepeat = rootProduction?.spans.find((span) => findModifier(span, 'repeats') && span.recursiveRoles.length > 0);
  const rootRepeatModifier = rootRepeat ? findModifier(rootRepeat, 'repeats') : undefined;
  if (!rootProduction || !rootRepeat?.name || !rootRepeatModifier?.sep) return null;
  const root = objectShape(rootProduction.structure);
  const rootChildrenKey = keyForSpanRef(rootProduction.structure, rootRepeat.name);
  if (!rootChildrenKey) return null;

  let comment: FastShape['comment'] | null = null;
  let block: BlockShape | null = null;
  let pair: PairShape | null = null;
  let prefixed: PrefixedShape | null = null;

  for (const info of schema.nodeTypes.values()) {
    if (!comment) comment = inferCommentShape(info);
    if (!block) block = inferBlockShape(info);
    if (!pair) pair = inferPairShape(info);
    if (!prefixed) prefixed = inferPrefixedShape(info);
  }

  if (!comment || !block || !pair || !prefixed) return null;
  const literals = inferFastLiterals(block, pair, prefixed, rootRepeatModifier.sep);
  if (!literals) return null;
  return {
    root: { ...root, childrenKey: rootChildrenKey },
    comment,
    block,
    pair,
    prefixed,
    literals,
  };
}

function inferCommentShape(info: NodeTypeInfo): FastShape['comment'] | null {
  if (info.productions.length !== 1) return null;
  const production = info.productions[0]!;
  const [span] = production.spans;
  if (!span?.name || span.class !== 'comment') return null;
  const textKey = keyForSpanRef(production.structure, span.name);
  if (!textKey) return null;
  return { ...objectShape(production.structure), textKey };
}

function inferBlockShape(info: NodeTypeInfo): BlockShape | null {
  if (info.productions.length !== 1) return null;
  const production = info.productions[0]!;
  const spans = production.spans;
  const first = spans[0];
  const open = spans[1];
  const repeated = spans.find((span) => span.name && findModifier(span, 'repeats') && span.recursiveRoles.length > 0);
  const close = spans[spans.length - 1];
  const until = first ? findModifier(first, 'until') : undefined;
  if (!first?.name || open?.class !== 'literal' || !open.text || !until?.stops.includes(open.text)) return null;
  if (!repeated?.name || close?.class !== 'literal' || !close.text) return null;
  const captureKey = keyForSpanRef(production.structure, first.name);
  const childrenKey = keyForSpanRef(production.structure, repeated.name);
  if (!captureKey || !childrenKey) return null;
  return { ...objectShape(production.structure), captureKey, childrenKey, openLiteral: open.text, closeLiteral: close.text };
}

function inferPairShape(info: NodeTypeInfo): PairShape | null {
  const productions = info.productions;
  if (productions.length < 1 || productions.length > 2) return null;
  const first = productions[0]!;
  const left = first.spans[0];
  const pairLiteral = first.spans[1];
  const right = first.spans[2];
  const leftUntil = left ? findModifier(left, 'until') : undefined;
  const rightUntil = right ? findModifier(right, 'until') : undefined;
  if (!left?.name || !right?.name || pairLiteral?.class !== 'literal' || !pairLiteral.text) return null;
  if (!leftUntil?.stops.includes(pairLiteral.text) || !rightUntil?.stops.length) return null;
  const leftKey = keyForSpanRef(first.structure, left.name);
  const rightKey = keyForSpanRef(first.structure, right.name);
  if (!leftKey || !rightKey) return null;
  let flagKey: string | null = null;
  let flagLiteral: string | null = null;
  for (const production of productions) {
    flagKey ??= keyForBooleanLiteral(production.structure, true);
    const valueSpan = production.spans[2];
    const valueUntil = valueSpan ? findModifier(valueSpan, 'until') : undefined;
    for (let i = 3; i < production.spans.length; i++) {
      const span = production.spans[i]!;
      if (span.class === 'literal' && span.text && span.text !== pairLiteral.text && valueUntil?.stops.includes(span.text)) {
        flagLiteral ??= span.text;
      }
    }
  }
  return { ...objectShape(first.structure), leftKey, rightKey, flagKey, pairLiteral: pairLiteral.text, flagLiteral };
}

function inferPrefixedShape(info: NodeTypeInfo): PrefixedShape | null {
  if (info.productions.length !== 2) return null;
  const blockProduction = info.productions.find((production) => production.spans.some((span) => span.name && findModifier(span, 'repeats') && span.recursiveRoles.length > 0));
  if (!blockProduction) return null;
  const spans = blockProduction.spans;
  const prefix = spans[0];
  const name = spans[1];
  const params = spans[2];
  const open = spans.find((span, index) => index > 2 && span.class === 'literal' && span.text);
  const repeated = spans.find((span) => span.name && findModifier(span, 'repeats') && span.recursiveRoles.length > 0);
  if (prefix?.class !== 'literal' || !prefix.text || !name?.name || name.class !== 'ident') return null;
  if (!params?.name || !open?.text || !findModifier(params, 'until')?.stops.includes(open.text) || !repeated?.name) return null;
  const nameKey = keyForSpanRef(blockProduction.structure, name.name);
  const paramsKey = keyForSpanRef(blockProduction.structure, params.name);
  const childrenKey = keyForSpanRef(blockProduction.structure, repeated.name);
  if (!nameKey || !paramsKey || !childrenKey) return null;
  return { ...objectShape(blockProduction.structure), nameKey, paramsKey, childrenKey, prefixLiteral: prefix.text };
}

function inferFastLiterals(
  block: BlockShape,
  pair: PairShape,
  prefixed: PrefixedShape,
  separator: string,
): FastShape['literals'] | null {
  const literals = [block.openLiteral, block.closeLiteral, pair.pairLiteral, separator, prefixed.prefixLiteral];
  if (pair.flagLiteral) literals.push(pair.flagLiteral);
  if (literals.some((literal) => literal.length !== 1)) return null;
  return {
    open: block.openLiteral,
    close: block.closeLiteral,
    pair: pair.pairLiteral,
    separator,
    prefix: prefixed.prefixLiteral,
    flag: pair.flagLiteral,
  };
}

function objectShape(value: StructureValue): ObjectShape {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isStructureRef(value)) {
    return { typeKey: null, typeValue: null };
  }
  for (const [key, child] of Object.entries(value as Record<string, StructureValue>)) {
    if (typeof child === 'string') return { typeKey: key, typeValue: child };
  }
  return { typeKey: null, typeValue: null };
}

function keyForSpanRef(value: StructureValue, spanName: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isStructureRef(value)) return null;
  for (const [key, child] of Object.entries(value as Record<string, StructureValue>)) {
    if (isStructureRef(child) && child.__ref === 'span-value' && child.name === spanName) return key;
  }
  return null;
}

function keyForBooleanLiteral(value: StructureValue, flag: boolean): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isStructureRef(value)) return null;
  for (const [key, child] of Object.entries(value as Record<string, StructureValue>)) {
    if (child === flag) return key;
  }
  return null;
}

function findModifier<K extends ResolvedSpan['modifiers'][number]['kind']>(
  span: ResolvedSpan,
  kind: K,
): Extract<ResolvedSpan['modifiers'][number], { kind: K }> | undefined {
  for (const modifier of span.modifiers) if (modifier.kind === kind) return modifier as Extract<ResolvedSpan['modifiers'][number], { kind: K }>;
  return undefined;
}

function emitNestedBlockFastPath(shape: FastShape): string {
  const rootType = typeProp(shape.root);
  const commentType = typeProp(shape.comment);
  const blockType = typeProp(shape.block);
  const pairType = typeProp(shape.pair);
  const prefixedType = typeProp(shape.prefixed);
  const pairFlag = shape.pair.flagKey ? `${prop(shape.pair.flagKey)}: true` : '';
  const pair = jsString(shape.literals.pair);
  const prefixCode = shape.literals.prefix.charCodeAt(0);
  const openCode = shape.literals.open.charCodeAt(0);
  const closeCode = shape.literals.close.charCodeAt(0);
  const pairCode = shape.literals.pair.charCodeAt(0);
  const separatorCode = shape.literals.separator.charCodeAt(0);
  const flagCode = shape.literals.flag ? shape.literals.flag.charCodeAt(0) : -1;
  const flagStopCheck = shape.literals.flag ? `valueScan.stop === ${flagCode}` : 'false';

  return `type DirectScan = {
  readonly stop: number;
  readonly stopIdx: number;
  readonly captureEnd: number;
  readonly colonIdx: number;
  readonly bangIdx: number;
};

type DirectState = {
  readonly input: string;
  readonly len: number;
  pos: number;
};

function parseDirectFast(input: string): unknown {
  const state: DirectState = { input, len: input.length, pos: 0 };
  const nodes = parseDirectChildren(state, -1);
  skipDirectWsAndSeparators(state);
  if (state.pos !== state.len) throw new SyntaxError(\`unexpected trailing character at position \${state.pos}\`);
  return { ${joinProps(rootType, `${prop(shape.root.childrenKey)}: nodes`)} };
}

function parseDirectChildren(state: DirectState, close: number): unknown[] {
  const nodes: unknown[] = [];
  const input = state.input;
  const len = state.len;
  while (true) {
    skipDirectWsAndSeparators(state);
    if (state.pos >= len) {
      if (close >= 0) throw new SyntaxError(\`expected '\${String.fromCharCode(close)}' at position \${state.pos}\`);
      return nodes;
    }
    const c = input.charCodeAt(state.pos);
    if (close >= 0 && c === close) return nodes;
    if (c === 0x60 /* \` */) throw new SyntaxError(\`Unexpected character '\${input[state.pos]}' at position \${state.pos}\`);
    if (c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */) {
      nodes.push(parseDirectComment(state));
      continue;
    }
    if (c === ${prefixCode}) {
      nodes.push(parseDirectPrefixed(state));
      continue;
    }
    nodes.push(parseDirectBlockOrPair(state));
  }
}

function parseDirectComment(state: DirectState): unknown {
  const input = state.input;
  const len = state.len;
  const start = state.pos;
  state.pos += 2;
  while (state.pos < len && !(input.charCodeAt(state.pos) === 0x2a && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2f)) state.pos++;
  if (state.pos < len) state.pos += 2;
  return { ${joinProps(commentType, `${prop(shape.comment.textKey)}: input.slice(start + 2, state.pos - 2).trim()`)} };
}

function parseDirectPrefixed(state: DirectState): unknown {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const nameStart = state.pos;
  readDirectIdent(state);
  const name = input.slice(nameStart, state.pos);
  const paramsScan = scanDirectBoundary(state, ${separatorCode}, ${openCode}, ${closeCode}, false);
  const params = trimDirectSlice(input, state.pos, paramsScan.captureEnd);
  state.pos = paramsScan.stopIdx;
  if (paramsScan.stop === ${openCode}) {
    state.pos++;
    const nodes = parseDirectChildren(state, ${closeCode});
    expectDirectChar(state, ${closeCode});
    return { ${joinProps(prefixedType, `${prop(shape.prefixed.nameKey)}: name`, `${prop(shape.prefixed.paramsKey)}: params`, `${prop(shape.prefixed.childrenKey)}: nodes`)} };
  }
  if (paramsScan.stop === ${separatorCode}) state.pos++;
  return { ${joinProps(prefixedType, `${prop(shape.prefixed.nameKey)}: name`, `${prop(shape.prefixed.paramsKey)}: params`)} };
}

function parseDirectBlockOrPair(state: DirectState): unknown {
  const input = state.input;
  const start = state.pos;
  const scan = scanDirectBoundary(state, ${openCode}, ${separatorCode}, ${closeCode}, true);
  const leading = trimDirectSlice(input, start, scan.captureEnd);
  if (scan.stop === ${openCode} && !leading.endsWith(${pair})) {
    const selector = leading;
    state.pos = scan.stopIdx + 1;
    const nodes = parseDirectChildren(state, ${closeCode});
    expectDirectChar(state, ${closeCode});
    return { ${joinProps(blockType, `${prop(shape.block.captureKey)}: selector`, `${prop(shape.block.childrenKey)}: nodes`)} };
  }
  if (scan.colonIdx < 0) throw new SyntaxError(\`expected ${shape.literals.pair} at position \${state.pos}\`);
  const prop = trimDirectSlice(input, start, scan.colonIdx);
  if (scan.stop === ${openCode}) {
    state.pos = scan.colonIdx + 1;
    return parseDirectDeclarationRest(state, prop);
  }
  const valueEnd = scan.bangIdx >= 0 ? scan.bangIdx : scan.captureEnd;
  const value = trimDirectSlice(input, scan.colonIdx + 1, valueEnd);
  state.pos = scan.bangIdx >= 0 ? scan.bangIdx : scan.stopIdx;
  if (scan.bangIdx >= 0) return parseDirectImportantDeclarationRest(state, prop, value);
  if (scan.stop === ${separatorCode}) state.pos++;
  return { ${joinProps(pairType, `${prop(shape.pair.leftKey)}: prop`, `${prop(shape.pair.rightKey)}: value`)} };
}

function parseDirectDeclarationRest(state: DirectState, prop: string): unknown {
  const input = state.input;
  const valueScan = scanDirectBoundary(state, ${separatorCode}, ${closeCode}, ${flagCode}, true);
  const value = trimDirectSlice(input, state.pos, valueScan.captureEnd);
  state.pos = valueScan.stopIdx;
  if (${flagStopCheck}) {
    return parseDirectImportantDeclarationRest(state, prop, value);
  }
  if (valueScan.stop === ${separatorCode}) state.pos++;
  return { ${joinProps(pairType, `${prop(shape.pair.leftKey)}: prop`, `${prop(shape.pair.rightKey)}: value`)} };
}

function parseDirectImportantDeclarationRest(state: DirectState, prop: string, value: string): unknown {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const importantStart = state.pos;
  readDirectIdent(state);
  const important = input.slice(importantStart, state.pos);
  if (important.length === 0) throw new SyntaxError(\`expected token of class 'ident' at position \${importantStart}\`);
  skipDirectWs(state);
  if (input.charCodeAt(state.pos) === ${separatorCode}) state.pos++;
  return { ${joinProps(pairType, `${prop(shape.pair.leftKey)}: prop`, `${prop(shape.pair.rightKey)}: value`, pairFlag)} };
}

function scanDirectBoundary(state: DirectState, stop0: number, stop1: number, stop2: number, watchColonBang: boolean): DirectScan {
  const input = state.input;
  const len = state.len;
  let pos = state.pos;
  let depth = 0;
  let colonIdx = -1;
  let bangIdx = -1;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c === 0x60 /* \` */) throw new SyntaxError(\`Unexpected character '\${input[pos]}' at position \${pos}\`);
    if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
      pos = skipDirectString(input, pos, len);
      continue;
    }
    if (c === 0x5c /* \\\\ */) {
      pos += pos + 1 < len ? 2 : 1;
      continue;
    }
    if (depth === 0) {
      if (watchColonBang && colonIdx < 0 && c === ${pairCode}) colonIdx = pos;
      if (watchColonBang && bangIdx < 0 && c === ${flagCode}) bangIdx = pos;
      if (c === stop0 || c === stop1 || c === stop2) break;
    }
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === ${openCode}) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === ${closeCode}) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  let captureEnd = pos;
  while (captureEnd > state.pos && isDirectWs(input.charCodeAt(captureEnd - 1))) captureEnd--;
  return {
    stop: pos < len ? input.charCodeAt(pos) : -1,
    stopIdx: pos,
    captureEnd,
    colonIdx,
    bangIdx,
  };
}

function skipDirectString(input: string, pos: number, len: number): number {
  const quote = input.charCodeAt(pos);
  pos++;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c === 0x5c /* \\\\ */) { pos += 2; continue; }
    pos++;
    if (c === quote) break;
  }
  return pos;
}

function readDirectIdent(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len) {
    const c = input.charCodeAt(state.pos);
    if (c === 0x5c /* \\\\ */) {
      state.pos += state.pos + 1 < len ? 2 : 1;
      continue;
    }
    if (!((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 45 || (c >= 48 && c <= 57))) break;
    state.pos++;
  }
}

function expectDirectChar(state: DirectState, ch: number): void {
  skipDirectWsAndSeparators(state);
  if (state.input.charCodeAt(state.pos) !== ch) throw new SyntaxError(\`expected '\${String.fromCharCode(ch)}' at position \${state.pos}\`);
  state.pos++;
}

function skipDirectWsAndSeparators(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len) {
    const c = input.charCodeAt(state.pos);
    if (isDirectWs(c) || c === ${separatorCode}) {
      state.pos++;
      continue;
    }
    break;
  }
}

function skipDirectWs(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len && isDirectWs(input.charCodeAt(state.pos))) state.pos++;
}

function trimDirectSlice(input: string, start: number, end: number): string {
  while (start < end && isDirectWs(input.charCodeAt(start))) start++;
  while (end > start && isDirectWs(input.charCodeAt(end - 1))) end--;
  return input.slice(start, end);
}

function isDirectWs(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}`;
}

function prop(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : jsString(key);
}

function typeProp(shape: ObjectShape): string {
  return shape.typeKey && shape.typeValue ? `${prop(shape.typeKey)}: ${jsString(shape.typeValue)}` : '';
}

function joinProps(...items: string[]): string {
  return items.filter(Boolean).join(', ');
}
