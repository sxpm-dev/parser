// Multi-production dispatcher emit. The ladder:
//   1. Byte-prefix dispatch — alts have distinct first-bytes (literal or
//      class-start predicate). One switch on charCodeAt(off).
//   2. Discriminator peek-scan — alts share a prefix and differ by a literal
//      at a known downstream position. (Not yet implemented in v2 first
//      slice.)
//   3. Sentinel speculation — try alts one by one with null-rewind. Last
//      resort. Never throws.
//
// This module's job is to pick the appropriate strategy for a given node
// and emit the dispatcher function.

import type { ResolvedSpan } from '../../model.ts';
import type { InferredSchema, NodeTypeInfo, Production } from '../../model.ts';
import { jsString } from '../strings.ts';
import { findModifier, hasModifier } from './span.ts';

type FirstToken =
  | { kind: 'literal'; text: string }
  | { kind: 'class'; cls: string; refKey: string; oneOfValues?: readonly string[] };

export function emitDispatcher(
  info: NodeTypeInfo,
  _schema: InferredSchema,
  parseFnName: (n: string) => string,
): string {
  const fnName = parseFnName(info.name);
  const prods = info.productions;
  const tokens: Array<FirstToken | null> = prods.map((p) => firstTokenOf(p));

  // Try byte-prefix dispatch first.
  const bytePrefix = tryEmitBytePrefix(info, prods, tokens, fnName);
  if (bytePrefix !== null) return bytePrefix;

  // Fall back to sentinel speculation chain.
  return emitSpeculationChain(info, prods, fnName);
}

// --- byte-prefix dispatch --------------------------------------------------
// All productions get a byte-discriminator. Groups of prods that share the
// same first-byte predicate are passed to a sub-dispatcher (recursive
// discrimination by peeking the byte AFTER the first one).

function tryEmitBytePrefix(
  info: NodeTypeInfo,
  prods: ReadonlyArray<Production>,
  tokens: ReadonlyArray<FirstToken | null>,
  fnName: string,
): string | null {
  if (tokens.some((t) => t === null)) return null;
  const knownTokens = tokens as FirstToken[];

  // Group by first-byte predicate.
  type Group = { check: string; bytePeek: string; prodIdxs: number[]; firstByteHint?: number };
  const groups: Group[] = [];
  for (let i = 0; i < prods.length; i++) {
    const t = knownTokens[i]!;
    let check: string;
    let bytePeek: string;
    let hint: number | undefined;
    if (t.kind === 'literal') {
      hint = t.text.charCodeAt(0);
      check = `input.charCodeAt(off) === ${hint}`;
      bytePeek = `byte === ${hint}`;
    } else {
      // class predicate at current pos
      check = classStartPredicate(t.cls, t.refKey, 'off');
      bytePeek = classStartPredicate(t.cls, t.refKey, 'off', 'byte');
    }
    let g = groups.find((x) => x.check === check);
    if (!g) { g = { check, bytePeek, prodIdxs: [], firstByteHint: hint }; groups.push(g); }
    g.prodIdxs.push(i);
  }

  // Each group: if single prod → direct call; if multiple → secondary
  // dispatch (currently: speculation chain among the group).
  const branches: string[] = [];
  // Sort: literal groups by descending text length so multi-char wins
  // over single-char prefixes; class groups last.
  groups.sort((a, b) => (a.firstByteHint !== undefined && b.firstByteHint === undefined ? -1
    : a.firstByteHint === undefined && b.firstByteHint !== undefined ? 1
    : 0));

  for (const g of groups) {
    const body = g.prodIdxs.length === 1
      ? `return ${fnName}__alt${g.prodIdxs[0]}(state);`
      : emitGroupSpeculation(g.prodIdxs, fnName, prods);
    branches.push(`if (${g.check}) {\n${indent(body, 1)}\n}`);
  }

  // Skip leading ws before dispatching.
  const skipWs = `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;`;

  return `function ${fnName}(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  ${skipWs}
  if (off >= len) return null;
  ${branches.join('\n  ')}
  return null;
}`;
}

function emitGroupSpeculation(prodIdxs: ReadonlyArray<number>, fnName: string, prods: ReadonlyArray<Production>): string {
  // For each candidate, call its alt; if null, try the next. State.pos is
  // already rewound by the alt's own failure path, so this composes.
  //
  // Order within a same-first-byte group:
  //   1. Longest first-span LITERAL prefix wins. Two alts whose first span
  //      both start with the same byte but one is "```\\n" and the other is
  //      "```" need the longer match tried first — otherwise a `'```\\n…'`
  //      input would be claimed by "```" and consume the LF into the next
  //      span (e.g. an ident scan eating the lang line below the fence).
  //      Matches v1's prefix-discriminator behavior.
  //   2. Fall back to span count descending — more spans = more structural
  //      commitment, useful when prefix lengths tie (e.g. two same-text
  //      literal first spans).
  //   3. Stable on author declaration order otherwise.
  const litLen = (idx: number): number => {
    const s0 = prods[idx]!.spans[0];
    if (s0 && s0.class === 'literal' && typeof s0.text === 'string') return s0.text.length;
    return 0;
  };
  const ordered = [...prodIdxs].sort((a, b) => {
    const lenDelta = litLen(b) - litLen(a);
    if (lenDelta !== 0) return lenDelta;
    return prods[b]!.spans.length - prods[a]!.spans.length;
  });
  const lines: string[] = [];
  for (let i = 0; i < ordered.length - 1; i++) {
    lines.push(`{ const r = ${fnName}__alt${ordered[i]}(state); if (r !== null) return r; }`);
  }
  lines.push(`return ${fnName}__alt${ordered[ordered.length - 1]}(state);`);
  return lines.join('\n');
}

function emitSpeculationChain(
  _info: NodeTypeInfo,
  prods: ReadonlyArray<Production>,
  fnName: string,
): string {
  // Stable reorder: any group of alts whose first span is a literal with
  // the SAME first byte gets reordered so the longer literal prefix is
  // tried first within that group. Other alts keep their declared order.
  // Matches v1's byte-prefix dispatcher behavior for the cases where v2
  // falls back to speculation (some alt has a first-span with no fixed
  // first byte — e.g. `.until()` on its first span).
  //
  // Concrete example: markdown's MarkdownLeaf has many setext / paragraph
  // alts that begin with `.until()` (no fixed byte), so the whole node
  // uses speculation. Within speculation, the fenced-code alts
  //   alt18: ```<lang>\n<body>```
  //   alt19: ```\n<body>```
  // both start with '`' but alt19's literal `"\`\`\`\n"` is longer than
  // alt18's `"\`\`\`"`. Trying alt19 first ensures `'\`\`\`\nplain\n\`\`\`'`
  // parses as the no-lang form (lang absent) instead of alt18 eating the
  // newline as inter-span ws and then matching `plain` as the ident-lang.
  const order = computeSpeculationOrder(prods);
  const lines: string[] = [];
  for (let i = 0; i < order.length - 1; i++) {
    lines.push(`  { const r = ${fnName}__alt${order[i]}(state); if (r !== null) return r; }`);
  }
  lines.push(`  return ${fnName}__alt${order[order.length - 1]}(state);`);
  return `function ${fnName}(state: State): unknown {
${lines.join('\n')}
}`;
}

function computeSpeculationOrder(prods: ReadonlyArray<Production>): number[] {
  // For each alt, compute its first-byte (if any) and first-literal length.
  const meta = prods.map((p, idx) => {
    const s0 = p.spans[0];
    if (s0 && s0.class === 'literal' && typeof s0.text === 'string' && s0.text.length > 0) {
      // First span must NOT be optional / recursive / until-modified to
      // be a stable byte-discriminator.
      if (!hasModifier(s0, 'optional')
          && !findModifier(s0, 'until')
          && !findModifier(s0, 'rawUntil')
          && !findModifier(s0, 'repeats')
          && s0.recursiveRoles.length === 0) {
        return { idx, firstByte: s0.text.charCodeAt(0), literalLen: s0.text.length };
      }
    }
    return { idx, firstByte: -1, literalLen: 0 };
  });
  // Group by firstByte. For groups with firstByte >= 0 (literal-prefix
  // group) and >1 member, sort by literalLen descending (stable: equal
  // lengths keep declared order). All other alts retain their declared
  // order. Rebuild the global order by walking the original index list
  // and substituting the next alt from each group's reordered queue when
  // we encounter an index in that group.
  const groups = new Map<number, number[]>();
  for (const m of meta) {
    if (m.firstByte < 0) continue;
    const arr = groups.get(m.firstByte) ?? [];
    arr.push(m.idx);
    groups.set(m.firstByte, arr);
  }
  for (const [byte, idxs] of groups) {
    if (idxs.length < 2) continue;
    // Stable longest-literal-first sort.
    idxs.sort((a, b) => {
      const la = prods[a]!.spans[0]!.text!.length;
      const lb = prods[b]!.spans[0]!.text!.length;
      if (la !== lb) return lb - la;
      return a - b;
    });
    groups.set(byte, idxs);
  }
  // Walk meta in declared order, substituting reordered group members.
  const consumed = new Map<number, number>();
  const order: number[] = [];
  for (const m of meta) {
    if (m.firstByte < 0) {
      order.push(m.idx);
      continue;
    }
    const idxs = groups.get(m.firstByte)!;
    const k = consumed.get(m.firstByte) ?? 0;
    order.push(idxs[k]!);
    consumed.set(m.firstByte, k + 1);
  }
  return order;
}

// --- first-token analysis --------------------------------------------------

function firstTokenOf(prod: Production): FirstToken | null {
  const spans = prod.spans;
  if (spans.length === 0) return null;
  const s0 = spans[0]!;
  if (findModifier(s0, 'until') || findModifier(s0, 'rawUntil') || findModifier(s0, 'repeats')) return null;
  if (hasModifier(s0, 'optional')) return null;
  if (s0.recursiveRoles.length > 0) return null;
  if (s0.class === 'literal') {
    if (!s0.text) return null;
    return { kind: 'literal', text: s0.text };
  }
  if (s0.class === 'comment') return { kind: 'literal', text: '/*' };
  const refKey = s0.refinements
    .filter((r) => r.name !== 'oneOf')
    .map((r) => r.name)
    .sort()
    .join('|');
  const oneOf = s0.refinements.find((r) => r.name === 'oneOf')?.args?.[0];
  const oneOfValues = Array.isArray(oneOf) && oneOf.every((v) => typeof v === 'string')
    ? (oneOf as readonly string[]).map((v) => v.toLowerCase())
    : undefined;
  return { kind: 'class', cls: s0.class, refKey, oneOfValues };
}

function classStartPredicate(cls: string, refKey: string, offExpr: string, byteVar?: string): string {
  const cExpr = byteVar !== undefined ? byteVar : `input.charCodeAt(${offExpr})`;
  if (cls === 'ident' && refKey.includes('js')) return `isJsIdentStart(${cExpr})`;
  if (cls === 'ident') return `(isCssIdentStart(${cExpr})${refKey.includes('css') || refKey.includes('html') ? '' : ' || ' + cExpr + ' === 0x5c'})`;
  if (cls === 'number') return `isDigit(${cExpr})`;
  if (cls === 'hex') return `isHexDigit(${cExpr})`;
  if (cls === 'string') return `(${cExpr} === 0x22 || ${cExpr} === 0x27)`;
  if (cls === 'comment') return `(${cExpr} === 0x2f && input.charCodeAt(${offExpr} + 1) === 0x2a)`;
  return 'false';
}

function indent(s: string, level: number): string {
  const pad = '  '.repeat(level);
  return s.split('\n').map((l) => (l ? pad + l : l)).join('\n');
}
