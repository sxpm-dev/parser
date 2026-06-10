// Until-viability guard — shared by the structured-fusion dispatchers and
// the captures-path role ladder.
//
// A production whose first span is a balanced until-scan followed by a plain
// single-char literal L (with L in the scan's stop set) can only succeed when
// the scan's first depth-0 terminator IS L. A captureless pre-scan finds that
// terminator; when it isn't L the whole production attempt is skipped — this
// kills "every Entry pays a full failed Block parse" waste in until-led
// unions. The guard is a necessary-condition check only: it may let a doomed
// attempt through (nonEmpty / rejectSuffix still fail inside), but it never
// skips a production that could have succeeded, because the real scan stops
// at exactly the same depth-0 terminator the helper returns. The helper
// mirrors the until kernel's skip machinery (brackets, strings, comments,
// url-raw, backslash, unknown-byte reject) derived from the SAME schema-level
// flags, so the two cannot disagree.
//
// Helper collection: emission happens deep inside span/ladder emitters where
// threading a sink through every signature would be invasive. Instead the
// module keeps a collection registry: `beginGuardHelpers()` opens it,
// `untilGuardSpec()` registers helper sources (deduped by content-derived
// name), `drainGuardHelpers()` closes it and returns the sources. Emission
// is fully synchronous, so begin/drain pairs cannot interleave. When no
// collection is open, untilGuardSpec returns null and no guards are emitted
// — paths that don't opt in are unaffected.

import type { InferredSchema, NodeTypeInfo } from '../../model.ts';
import type { SpanModifier } from '@parser2/parser';
import { computeKnownLeadingBytes, type SpanContext } from './span.ts';

export type GuardEnv = {
  readonly nodeTypes: ReadonlyMap<string, NodeTypeInfo>;
  readonly hasStrings: boolean;
  readonly hasComments: boolean;
  readonly useUrlRaw: boolean;
  readonly unknownGuard: boolean;
  readonly knownBytes: Uint8Array;
};

export type UntilGuardSpec = {
  readonly helperName: string;
  readonly litCode: number;
};

let registry: Map<string, string> | null = null;

export function beginGuardHelpers(): void {
  registry = new Map();
}

export function drainGuardHelpers(): string[] {
  const out = registry === null ? [] : [...registry.values()];
  registry = null;
  return out;
}

export function guardEnvFromSpanContext(ctx: SpanContext): GuardEnv {
  return {
    nodeTypes: ctx.nodeTypes,
    hasStrings: ctx.tokens.has('string'),
    hasComments: ctx.tokens.has('comment'),
    useUrlRaw: ctx.cssIdent,
    unknownGuard: ctx.emitUnknownCharsGuard,
    knownBytes: ctx.knownBytes,
  };
}

export function guardEnvFromSchema(schema: InferredSchema): GuardEnv {
  const hasStrings = schema.classes.some((c) => c.class === 'string');
  const hasComments = schema.classes.some((c) => c.class === 'comment');
  const cssIdent = schema.classes.some(
    (c) => c.class === 'ident' && c.refinements.some((r) => r.name === 'css'),
  );
  const contentClasses = new Set(['ident', 'number', 'hex', 'string', 'operator']);
  const unknownGuard =
    schema.unknownChars === 'reject' && schema.classes.some((c) => contentClasses.has(c.class));
  return {
    nodeTypes: schema.nodeTypes,
    hasStrings,
    hasComments,
    useUrlRaw: cssIdent,
    unknownGuard,
    knownBytes: computeKnownLeadingBytes(schema),
  };
}

export function untilGuardSpec(role: string, env: GuardEnv): UntilGuardSpec | null {
  if (registry === null) return null;
  const info = env.nodeTypes.get(role);
  if (!info || info.productions.length === 0) return null;

  let stopsKey: string | null = null;
  let lit: string | null = null;
  for (const prod of info.productions) {
    const s0 = prod.spans[0];
    const s1 = prod.spans[1];
    if (!s0 || !s1) return null;
    if (s0.recursiveRoles.length > 0) return null;
    const until = s0.modifiers.find((m) => m.kind === 'until') as
      | Extract<SpanModifier, { kind: 'until' }>
      | undefined;
    if (!until || !until.balanced) return null;
    if (until.stops.some((s) => s.length !== 1)) return null;
    if (s1.class !== 'literal' || typeof s1.text !== 'string' || s1.text.length !== 1) return null;
    if (s1.modifiers.length > 0 || s1.recursiveRoles.length > 0) return null;
    if (!until.stops.includes(s1.text)) return null;
    const key = [...until.stops].sort().join('');
    if (stopsKey === null) {
      stopsKey = key;
      lit = s1.text;
    } else if (stopsKey !== key || lit !== s1.text) {
      // Mixed stop sets / follow literals across productions would need one
      // helper per production — not worth the extra pre-scans. Bail.
      return null;
    }
  }
  if (stopsKey === null || lit === null) return null;

  // knownBytes participates in the content key: two schemas composed into
  // one module could share stop sets + flags but differ in known bytes, and
  // name-dedupe must never merge helpers with different tables.
  const kbKey = env.unknownGuard ? fnvHash(Array.from(env.knownBytes).join(',')) : '0';
  const flagsKey = `${stopsKey}|s${env.hasStrings ? 1 : 0}c${env.hasComments ? 1 : 0}u${env.useUrlRaw ? 1 : 0}k${env.unknownGuard ? 1 : 0}|${kbKey}`;
  const helperName = `__untilTerminator_${fnvHash(flagsKey)}`;
  if (!registry.has(helperName)) {
    registry.set(helperName, emitTerminatorHelper(helperName, stopsKey, env));
  }
  return { helperName, litCode: lit.charCodeAt(0) };
}

function emitTerminatorHelper(name: string, stopChars: string, env: GuardEnv): string {
  const stopCond = [...stopChars]
    .map((s) => `__c === ${s.charCodeAt(0)}`)
    .join(' || ');
  const lines: string[] = [];
  lines.push(`function ${name}(input: string, off: number, len: number): number {`);
  lines.push(`  let __depth = 0;`);
  if (env.unknownGuard) {
    lines.push(`  const __KB = [${Array.from(env.knownBytes).join(',')}];`);
  }
  lines.push(`  while (off < len) {`);
  lines.push(`    const __c = input.charCodeAt(off);`);
  lines.push(`    if (__depth === 0 && (${stopCond})) return __c;`);
  lines.push(`    if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; off++; continue; }`);
  lines.push(`    if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {`);
  lines.push(`      if (__depth === 0) return __c;`);
  lines.push(`      __depth--; off++; continue;`);
  lines.push(`    }`);
  if (env.hasStrings) {
    lines.push(`    if (__c === 0x22 || __c === 0x27) {`);
    lines.push(`      const __q = __c;`);
    lines.push(`      off++;`);
    lines.push(`      while (off < len) {`);
    lines.push(`        const __sc = input.charCodeAt(off);`);
    lines.push(`        if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }`);
    lines.push(`        if (__sc === __q) { off++; break; }`);
    lines.push(`        if (__sc === 0x0a || __sc === 0x0d) break;`);
    lines.push(`        off++;`);
    lines.push(`      }`);
    lines.push(`      continue;`);
    lines.push(`    }`);
  }
  if (env.useUrlRaw) {
    lines.push(`    if (__depth === 0 && (__c === 0x75 || __c === 0x55)`);
    lines.push(`      && off + 3 < len`);
    lines.push(`      && (input.charCodeAt(off + 1) | 32) === 0x72`);
    lines.push(`      && (input.charCodeAt(off + 2) | 32) === 0x6c`);
    lines.push(`      && input.charCodeAt(off + 3) === 0x28) {`);
    lines.push(`      off += 4;`);
    lines.push(`      while (off < len) {`);
    lines.push(`        const __uc = input.charCodeAt(off);`);
    lines.push(`        if (__uc === 0x29) { off++; break; }`);
    lines.push(`        if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }`);
    lines.push(`        if (__uc === 0x22 || __uc === 0x27) {`);
    lines.push(`          const __uq = __uc;`);
    lines.push(`          off++;`);
    lines.push(`          while (off < len) {`);
    lines.push(`            const __usc = input.charCodeAt(off);`);
    lines.push(`            if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }`);
    lines.push(`            if (__usc === __uq) { off++; break; }`);
    lines.push(`            if (__usc === 0x0a || __usc === 0x0d) break;`);
    lines.push(`            off++;`);
    lines.push(`          }`);
    lines.push(`          continue;`);
    lines.push(`        }`);
    lines.push(`        off++;`);
    lines.push(`      }`);
    lines.push(`      continue;`);
    lines.push(`    }`);
  }
  if (env.hasComments) {
    lines.push(`    if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {`);
    lines.push(`      let __ce = off + 2;`);
    lines.push(`      while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;`);
    lines.push(`      if (__ce < len) { off = __ce + 2; continue; }`);
    lines.push(`    }`);
  }
  lines.push(`    if (__c === 0x5c && off + 1 < len) { off += 2; continue; }`);
  if (env.unknownGuard) {
    lines.push(`    if (__depth === 0 && __KB[__c] === 0) return __c;`);
  }
  lines.push(`    off++;`);
  lines.push(`  }`);
  lines.push(`  return -1;`);
  lines.push(`}`);
  return lines.join('\n');
}

function fnvHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
