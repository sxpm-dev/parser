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
import { detectSharedDispatch, emitSharedDispatcher } from './shared-dispatch.ts';
import { detectPrefixShare, emitPrefixShareDispatcher } from './prefix-share-dispatch.ts';
import { findModifier, hasModifier } from './span.ts';

type FirstToken =
  | { kind: 'literal'; text: string }
  | { kind: 'class'; cls: string; refKey: string; oneOfValues?: readonly string[] };

export function emitDispatcher(
  info: NodeTypeInfo,
  schema: InferredSchema,
  parseFnName: (n: string) => string,
): string {
  const fnName = parseFnName(info.name);
  const prods = info.productions;
  const tokens: Array<FirstToken | null> = prods.map((p) => firstTokenOf(p));

  // Try shared-prefix oneOf-discriminated dispatch first. When a relation's
  // alts share a literal-then-ident-with-oneOf prefix (HTML's HtmlElement is
  // the motivating case: 17 alts, ~15 with `.oneOf(...)` on the tag), peek
  // the tag once and switch directly to the alts whose oneOf could match —
  // catch-all alts (no oneOf at the discriminator position) still get probed
  // afterward in declaration order, preserving the existing semantics.
  const shared = detectSharedDispatch(info);
  if (shared !== null) {
    const altFnNames = prods.map((_p, idx) => `${fnName}__alt${idx}`);
    const leadingLiteral = prods[0]!.spans[0]!.text!;
    const discriminatorSpan = prods[0]!.spans[shared.discriminatorIdx]!;
    return emitSharedDispatcher(fnName, altFnNames, shared, leadingLiteral, discriminatorSpan);
  }

  // Generic shared-prefix factoring — K>=2 alts share a byte-identical
  // prefix and split on a literal token after it. pg-select.Select is the
  // motivating case: four alts share `SELECT cols FROM table` and split on
  // ` WHERE …` / ` LIMIT …` presence. Tried after detectSharedDispatch
  // because the K=1-with-oneOf shape is more specific (the shared dispatcher
  // can switch on the tag value directly).
  const prefixShare = detectPrefixShare(info);
  if (prefixShare !== null) {
    const altFnNames = prods.map((_p, idx) => `${fnName}__alt${idx}`);
    return emitPrefixShareDispatcher(info, schema, fnName, altFnNames, prefixShare);
  }

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
  // Phase 5 (perf): when every alt in this same-first-byte group has a
  // pure-literal first span (no modifiers, no recursive role), try to
  // find a single second discriminator byte position that partitions
  // the group into singletons. When found, emit a switch on that byte
  // and route each alt directly with zero speculation. Saves the cost
  // of every losing alt re-matching its full literal prefix.
  //
  // Concrete wins:
  //   rrule.FreqValue group "M" → byte[1] discriminates: I→MINUTELY, O→MONTHLY
  //   rrule.Weekday group "S"   → byte[1] discriminates: U→SU, A→SA
  //   rrule.Weekday group "T"   → byte[1] discriminates: U→TU, H→TH
  //   pg-select.Operator group "<" → byte[1] discriminates: = → "<=" else "<"
  //   pg-select.Operator group ">" → byte[1] discriminates: = → ">=" else ">"
  //   css.AtRule group "@"          → byte[1] discriminates: charset / media markers
  //
  // Fall back to the legacy ordered speculation when no single position
  // discriminates (e.g. a group of 5+ overlapping prefixes).
  const trieDispatch = tryEmitTrieDispatch(prodIdxs, fnName, prods);
  if (trieDispatch !== null) return trieDispatch;
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
  // True when SOME span in the production has a class refinement that
  // restricts its match to a fixed set of literal values (`.oneOf(...)`).
  // Used as a "tag-restricted" signal: in HtmlElement, every implicit-close
  // alt has `.span('tag', ...).ident().html().oneOf(['li', 'dt', …])`
  // restricting the open-tag ident, while the catch-all regular form
  // does NOT have a oneOf. Tag-restricted alts must be tried first so the
  // tag-name discriminator wins before the catch-all happily accepts any
  // tag and mis-parses the body with its non-implicit-close grammar.
  const isRestricted = (idx: number): boolean => {
    for (const span of prods[idx]!.spans) {
      if (span.refinements.some((r) => r.name === 'oneOf')) return true;
    }
    return false;
  };
  const ordered = [...prodIdxs].sort((a, b) => {
    // 1. Tag-restricted alts (have `.oneOf(...)` refinement somewhere) win
    //    over unrestricted ones. Mirrors v1's tag-name peek-discriminator
    //    that routes a `<li>` input directly to the li alt instead of the
    //    catch-all `<tag>…</tag>` alt.
    const restA = isRestricted(a);
    const restB = isRestricted(b);
    if (restA !== restB) return restA ? -1 : 1;
    // 2. Longest first-span literal prefix wins (e.g. "```\\n" > "```").
    const lenDelta = litLen(b) - litLen(a);
    if (lenDelta !== 0) return lenDelta;
    // 3. Span count descending — more spans = more structural commitment.
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

// Phase 5 (perf): trie-based byte discrimination within a same-first-byte
// group. Each alt must have a pure-literal first span (no modifiers, no
// recursion, text non-empty); otherwise we fall back to speculation.
//
// The trie's branching point is the earliest byte position where the alts'
// literal first-span texts differ. If a single position cleanly partitions
// the group into singletons, emit a flat switch on input[off + P]. If
// two-level discrimination is needed (two alts agree on byte P but
// differ later), recurse into nested switches. Cap recursion at 3 levels
// to keep the emitted code compact; larger groups fall back to speculation
// (which is fine — they don't appear in practice).
function tryEmitTrieDispatch(
  prodIdxs: ReadonlyArray<number>,
  fnName: string,
  prods: ReadonlyArray<Production>,
): string | null {
  // Eligibility: every alt has a pure-literal first span.
  type Cand = { idx: number; text: string };
  const cands: Cand[] = [];
  for (const idx of prodIdxs) {
    const s0 = prods[idx]!.spans[0];
    if (!s0 || s0.class !== 'literal' || typeof s0.text !== 'string' || s0.text.length === 0) return null;
    if (hasModifier(s0, 'optional') || findModifier(s0, 'until') || findModifier(s0, 'rawUntil') || findModifier(s0, 'repeats')) return null;
    if (s0.recursiveRoles.length > 0) return null;
    cands.push({ idx, text: s0.text });
  }
  // Need >1 alt to be worth a switch.
  if (cands.length <= 1) return null;
  // Two alts with identical first-span text: byte discrimination can't help.
  // Keep the longest-first ordering by falling back to speculation.
  const texts = new Set(cands.map((c) => c.text));
  if (texts.size < cands.length) return null;
  const body = buildTrieBody(cands, fnName, /*offByte*/ 1, /*depth*/ 0);
  if (body === null) return null;
  return body;
}

function buildTrieBody(
  cands: ReadonlyArray<{ idx: number; text: string }>,
  fnName: string,
  bytePos: number,
  depth: number,
): string | null {
  // Cap nesting depth — beyond 3 levels the emitted switch nest becomes
  // hard to read and the speculation fallback is competitive (very few
  // overlapping prefixes go that deep in practice).
  if (depth > 3) return null;
  // If only one candidate remains, route to it directly.
  if (cands.length === 1) {
    return `return ${fnName}__alt${cands[0]!.idx}(state);`;
  }
  // Group candidates by their byte at `bytePos`. Short literals (text.length <=
  // bytePos) are EOF-equivalent at this position — they get their own group.
  type Branch = { byte: number | null; members: Array<{ idx: number; text: string }> };
  const branches = new Map<number | null, Branch>();
  for (const c of cands) {
    const key = c.text.length > bytePos ? c.text.charCodeAt(bytePos) : null;
    let b = branches.get(key);
    if (!b) { b = { byte: key, members: [] }; branches.set(key, b); }
    b.members.push(c);
  }
  // If everything collapses into one byte-key, the bytePos doesn't
  // discriminate — try the next position.
  if (branches.size === 1) {
    return buildTrieBody(cands, fnName, bytePos + 1, depth);
  }
  // Each branch: recurse. For a singleton, route directly; for >1 members,
  // they still agree at bytePos but differ later — recurse with bytePos+1.
  const lines: string[] = [];
  for (const b of branches.values()) {
    if (b.byte === null) {
      // EOF-equivalent at bytePos. There can only be one short literal
      // sharing all prior bytes — by the dedup check above, every alt's
      // text is unique. Route directly.
      const m = b.members[0]!;
      lines.push(`if (off + ${m.text.length} <= len) { return ${fnName}__alt${m.idx}(state); }`);
      continue;
    }
    const inner = buildTrieBody(b.members, fnName, bytePos + 1, depth + 1);
    if (inner === null) {
      // Couldn't discriminate further within this sub-group — fall back
      // entirely. Caller will use speculation.
      return null;
    }
    lines.push(`if (off + ${bytePos} < len && input.charCodeAt(off + ${bytePos}) === ${b.byte}) {\n${indent(inner, 1)}\n}`);
  }
  lines.push(`return null;`);
  return lines.join('\n');
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
