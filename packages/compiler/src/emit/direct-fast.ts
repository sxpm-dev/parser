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
  readonly comment: (ObjectShape & { readonly textKey: string }) | null;
  readonly block: ObjectShape & { readonly captureKey: string; readonly childrenKey: string };
  readonly pair: ObjectShape & { readonly leftKey: string; readonly rightKey: string; readonly flagKey: string | null };
  readonly prefixed: (ObjectShape & { readonly nameKey: string; readonly paramsKey: string; readonly childrenKey: string }) | null;
  readonly literals: {
    readonly open: string;
    readonly close: string;
    readonly pair: string;
    readonly separator: string;
    readonly prefix: string | null;
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

  if (!block || !pair) return null;
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
  prefixed: PrefixedShape | null,
  separator: string,
): FastShape['literals'] | null {
  const literals = [block.openLiteral, block.closeLiteral, pair.pairLiteral, separator];
  if (prefixed) literals.push(prefixed.prefixLiteral);
  if (pair.flagLiteral) literals.push(pair.flagLiteral);
  if (literals.some((literal) => literal.length !== 1)) return null;
  return {
    open: block.openLiteral,
    close: block.closeLiteral,
    pair: pair.pairLiteral,
    separator,
    prefix: prefixed?.prefixLiteral ?? null,
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
  const commentType = shape.comment ? typeProp(shape.comment) : '';
  const blockType = typeProp(shape.block);
  const pairType = typeProp(shape.pair);
  const prefixedType = shape.prefixed ? typeProp(shape.prefixed) : '';
  const pairFlag = shape.pair.flagKey ? `${prop(shape.pair.flagKey)}: true` : '';
  const prefixCode = shape.literals.prefix?.charCodeAt(0) ?? -1;
  const openCode = shape.literals.open.charCodeAt(0);
  const closeCode = shape.literals.close.charCodeAt(0);
  const pairCode = shape.literals.pair.charCodeAt(0);
  const separatorCode = shape.literals.separator.charCodeAt(0);
  const flagCode = shape.literals.flag ? shape.literals.flag.charCodeAt(0) : -1;
  const flagStopCheck = shape.literals.flag ? `state.scanStop === ${flagCode}` : 'false';
  const flagCapture = shape.literals.flag ? `      if (colonIdx >= 0 && bangIdx < 0 && c === ${flagCode}) bangIdx = pos;
` : '';
  const commentRootBranch = shape.comment ? `    if (c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */) {
      nodes[nodes.length] = parseDirectComment(state);
      continue;
    }
` : '';
  const commentFn = shape.comment ? `
function parseDirectComment(state: DirectState): unknown {
  const input = state.input;
  const len = state.len;
  const start = state.pos;
  state.pos += 2;
  while (state.pos < len && !(input.charCodeAt(state.pos) === 0x2a && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2f)) state.pos++;
  if (state.pos < len) state.pos += 2;
  let textStart = start + 2;
  let textEnd = state.pos - 2;
  while (textStart < textEnd) {
    const lc = input.charCodeAt(textStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    textStart++;
  }
  while (textEnd > textStart) {
    const tc = input.charCodeAt(textEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    textEnd--;
  }
  return { ${joinProps(commentType, `${prop(shape.comment.textKey)}: input.slice(textStart, textEnd)`)} };
}
` : '';
  const prefixedRootBranch = shape.prefixed ? `    if (c === ${prefixCode}) {
      nodes[nodes.length] = parseDirectPrefixed(state);
      continue;
    }
` : '';
  const prefixedFn = shape.prefixed ? `
function parseDirectPrefixed(state: DirectState): unknown {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const nameStart = state.pos;
  readDirectIdent(state);
  const name = input.slice(nameStart, state.pos);
  scanDirectBoundary(state, ${separatorCode}, ${openCode}, ${closeCode});
  const params = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
  const scanStop = state.scanStop;
  state.pos = state.scanStopIdx;
  if (scanStop === ${openCode}) {
    state.pos++;
    const nodes = parseDirectChildren(state);
    return { ${joinProps(prefixedType, `${prop(shape.prefixed.nameKey)}: name`, `${prop(shape.prefixed.paramsKey)}: params`, `${prop(shape.prefixed.childrenKey)}: nodes`)} };
  }
  if (scanStop === ${separatorCode}) state.pos++;
  return { ${joinProps(prefixedType, `${prop(shape.prefixed.nameKey)}: name`, `${prop(shape.prefixed.paramsKey)}: params`)} };
}
` : '';

  return `type DirectState = {
  readonly input: string;
  readonly len: number;
  pos: number;
  scanStop: number;
  scanStopIdx: number;
  scanCaptureStart: number;
  scanCaptureEnd: number;
  scanColonIdx: number;
  scanBangIdx: number;
};

function parseDirectFast(input: string): unknown {
  const state: DirectState = {
    input,
    len: input.length,
    pos: 0,
    scanStop: -1,
    scanStopIdx: 0,
    scanCaptureStart: 0,
    scanCaptureEnd: 0,
    scanColonIdx: -1,
    scanBangIdx: -1,
  };
  const nodes = parseDirectRootChildren(state);
  skipDirectWsAndSeparators(state);
  if (state.pos !== state.len) throw new SyntaxError(\`unexpected trailing character at position \${state.pos}\`);
  return { ${joinProps(rootType, `${prop(shape.root.childrenKey)}: nodes`)} };
}

function parseDirectRootChildren(state: DirectState): unknown[] {
  const nodes: unknown[] = [];
  const input = state.input;
  const len = state.len;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== ${separatorCode}) break;
      state.pos++;
    }
    if (state.pos >= len) return nodes;
    const c = input.charCodeAt(state.pos);
    if (c === 0x60 /* \` */) throw new SyntaxError(\`Unexpected character '\${input[state.pos]}' at position \${state.pos}\`);
${commentRootBranch}${prefixedRootBranch}    nodes[nodes.length] = parseDirectBlockOrPair(state);
  }
}

function parseDirectChildren(state: DirectState): unknown[] {
  const nodes: unknown[] = [];
  const input = state.input;
  const len = state.len;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== ${separatorCode}) break;
      state.pos++;
    }
    if (state.pos >= len) {
      throw new SyntaxError(\`expected '${shape.literals.close}' at position \${state.pos}\`);
    }
    const c = input.charCodeAt(state.pos);
    if (c === ${closeCode}) {
      state.pos++;
      return nodes;
    }
    if (c === 0x60 /* \` */) throw new SyntaxError(\`Unexpected character '\${input[state.pos]}' at position \${state.pos}\`);
${commentRootBranch}${prefixedRootBranch}    nodes[nodes.length] = parseDirectBlockOrPair(state);
  }
}
${commentFn}${prefixedFn}

function parseDirectBlockOrPair(state: DirectState): unknown {
  const input = state.input;
  scanDirectPairBoundary(state, ${openCode}, ${separatorCode}, ${closeCode});
  if (state.scanStop === ${openCode}) {
    const rejectsBlock = state.scanCaptureEnd > state.scanCaptureStart && input.charCodeAt(state.scanCaptureEnd - 1) === ${pairCode};
    if (!rejectsBlock) {
      const selector = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
      if (selector.length === 0) throw new SyntaxError(\`expected selector at position \${state.pos}\`);
      const selectorEnd = input.charCodeAt(state.scanCaptureEnd - 1);
      if (selectorEnd === 0x2c /* , */ || selectorEnd === 0x3e /* > */ || selectorEnd === 0x2b /* + */ || selectorEnd === 0x7e /* ~ */) {
        throw new SyntaxError(\`expected selector after combinator at position \${state.scanCaptureEnd}\`);
      }
      state.pos = state.scanStopIdx + 1;
      const nodes = parseDirectChildren(state);
      return { ${joinProps(blockType, `${prop(shape.block.captureKey)}: selector`, `${prop(shape.block.childrenKey)}: nodes`)} };
    }
  }
  const scanColonIdx = state.scanColonIdx;
  if (scanColonIdx < 0) {
    const found = state.scanStopIdx < state.len ? \`'\${input[state.scanStopIdx]}'\` : 'end of input';
    directSyntaxError(state, \`Unexpected \${found}\`, state.scanStopIdx);
  }
  const scanCaptureStart = state.scanCaptureStart;
  const scanCaptureEnd = state.scanCaptureEnd;
  const scanBangIdx = state.scanBangIdx;
  let pairLeftEnd = scanColonIdx;
  while (pairLeftEnd > scanCaptureStart) {
    const lc = input.charCodeAt(pairLeftEnd - 1);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    pairLeftEnd--;
  }
  const prop = input.slice(scanCaptureStart, pairLeftEnd);
  if (state.scanStop === ${openCode}) {
    state.pos = scanColonIdx + 1;
    return parseDirectDeclarationRest(state, prop);
  }
  let pairRightStart = scanColonIdx + 1;
  const rawRightEnd = scanBangIdx >= 0 ? scanBangIdx : scanCaptureEnd;
  while (pairRightStart < rawRightEnd) {
    const lc = input.charCodeAt(pairRightStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    pairRightStart++;
  }
  let pairRightEnd = rawRightEnd;
  while (pairRightEnd > pairRightStart) {
    const tc = input.charCodeAt(pairRightEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    pairRightEnd--;
  }
  const value = input.slice(pairRightStart, pairRightEnd);
  state.pos = scanBangIdx >= 0 ? scanBangIdx : state.scanStopIdx;
  if (scanBangIdx >= 0) return parseDirectImportantDeclarationRest(state, prop, value);
  if (state.scanStop === ${separatorCode}) state.pos++;
  return { ${joinProps(pairType, `${prop(shape.pair.leftKey)}: prop`, `${prop(shape.pair.rightKey)}: value`)} };
}

function parseDirectDeclarationRest(state: DirectState, prop: string): unknown {
  const input = state.input;
  scanDirectValueBoundary(state, ${separatorCode}, ${closeCode}, ${flagCode});
  const value = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
  state.pos = state.scanStopIdx;
  if (${flagStopCheck}) {
    return parseDirectImportantDeclarationRest(state, prop, value);
  }
  if (state.scanStop === ${separatorCode}) state.pos++;
  return { ${joinProps(pairType, `${prop(shape.pair.leftKey)}: prop`, `${prop(shape.pair.rightKey)}: value`)} };
}

function parseDirectImportantDeclarationRest(state: DirectState, prop: string, value: string): unknown {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const importantStart = state.pos;
  readDirectIdent(state);
  if (state.pos === importantStart) throw new SyntaxError(\`expected token of class 'ident' at position \${importantStart}\`);
  skipDirectWs(state);
  if (input.charCodeAt(state.pos) === ${separatorCode}) state.pos++;
  return { ${joinProps(pairType, `${prop(shape.pair.leftKey)}: prop`, `${prop(shape.pair.rightKey)}: value`, pairFlag)} };
}

function scanDirectBoundary(state: DirectState, stop0: number, stop1: number, stop2: number): void {
  const input = state.input;
  const len = state.len;
  const startPos = state.pos;
  let pos = startPos;
  let depth = 0;
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
      if (c === stop0 || c === stop1 || c === stop2) break;
    }
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === ${openCode}) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === ${closeCode}) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  let captureStart = startPos;
  while (captureStart < pos) {
    const lc = input.charCodeAt(captureStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    captureStart++;
  }
  let captureEnd = pos;
  while (captureEnd > captureStart) {
    const tc = input.charCodeAt(captureEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    captureEnd--;
  }
  state.scanStop = pos < len ? input.charCodeAt(pos) : -1;
  state.scanStopIdx = pos;
  state.scanCaptureStart = captureStart;
  state.scanCaptureEnd = captureEnd;
  state.scanColonIdx = -1;
  state.scanBangIdx = -1;
}

function scanDirectPairBoundary(state: DirectState, stop0: number, stop1: number, stop2: number): void {
  const input = state.input;
  const len = state.len;
  const startPos = state.pos;
  let pos = startPos;
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
      if (colonIdx < 0 && c === ${pairCode}) colonIdx = pos;
${flagCapture}      if (c === stop0 || c === stop1 || c === stop2) break;
    }
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === ${openCode}) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === ${closeCode}) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  // Callers (parseDirectChildren / parseDirectRootChildren) always advance past
  // whitespace and separators before dispatching here, so the leading-trim
  // loop is dead. captureStart is always the entry pos.
  let captureEnd = pos;
  while (captureEnd > startPos) {
    const tc = input.charCodeAt(captureEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    captureEnd--;
  }
  state.scanStop = pos < len ? input.charCodeAt(pos) : -1;
  state.scanStopIdx = pos;
  state.scanCaptureStart = startPos;
  state.scanCaptureEnd = captureEnd;
  state.scanColonIdx = colonIdx;
  state.scanBangIdx = bangIdx;
}

function scanDirectValueBoundary(state: DirectState, stop0: number, stop1: number, stop2: number): void {
  const input = state.input;
  const len = state.len;
  const startPos = state.pos;
  let pos = startPos;
  let depth = 0;
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
    if (depth === 0 && (c === stop0 || c === stop1 || c === stop2)) break;
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === ${openCode}) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === ${closeCode}) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  let captureStart = startPos;
  while (captureStart < pos) {
    const lc = input.charCodeAt(captureStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    captureStart++;
  }
  let captureEnd = pos;
  while (captureEnd > captureStart) {
    const tc = input.charCodeAt(captureEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    captureEnd--;
  }
  state.scanStop = pos < len ? input.charCodeAt(pos) : -1;
  state.scanStopIdx = pos;
  state.scanCaptureStart = captureStart;
  state.scanCaptureEnd = captureEnd;
  state.scanColonIdx = -1;
  state.scanBangIdx = -1;
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

function isDirectWs(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}

function directSyntaxError(state: DirectState, message: string, offset: number): never {
  const input = state.input;
  let lineStart = offset;
  while (lineStart > 0) {
    const c = input.charCodeAt(lineStart - 1);
    if (c === 0x0a || c === 0x0d) break;
    lineStart--;
  }
  let lineEnd = offset;
  while (lineEnd < input.length) {
    const c = input.charCodeAt(lineEnd);
    if (c === 0x0a || c === 0x0d) break;
    lineEnd++;
  }
  let line = 1;
  for (let i = 0; i < lineStart; i++) if (input.charCodeAt(i) === 0x0a) line++;
  const source = input.slice(lineStart, lineEnd);
  const gutter = String(line);
  const column = Math.max(0, offset - lineStart);
  throw new SyntaxError(\`\${message} at position \${offset}
\${gutter} | \${source}
\${' '.repeat(gutter.length)} | \${' '.repeat(column)}^\`);
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
