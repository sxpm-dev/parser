// Dispatch-uniqueness theorems at codegen (Tasks 3.2 + 3.3).
//
// Property statement:
//
//   For every node type with >1 productions, the parse-time dispatcher must
//   be able to pick ONE production from the input bytes ALONE. The
//   dispatcher's primary strategy is first-byte discrimination; when bytes
//   overlap, it falls back to ordered speculation (try each in turn, first
//   to fully match wins). Speculation is CORRECT only when no two
//   productions can both accept the same input prefix — otherwise the
//   declaration order silently picks a winner that the schema author may
//   not have intended.
//
//   This check refuses to emit when two productions of the same node type
//   have IDENTICAL fixed-shape fingerprints (same literal/class/refinement
//   sequence) — those productions are not statically distinguishable from
//   the input alone, so the dispatcher would resolve them by declaration
//   order which the spec does NOT guarantee.
//
// Two flavors of check, both in one file because 3.3 is the byte-level
// subset of 3.2 — sharing the same first-byte signature computation and
// the same pair-wise discrimination algebra:
//
//   1. checkFirstByteConflicts   (3.3)
//      Walks every (prod_i, prod_j) pair in the same node type and asserts
//      they are statically distinguishable by ONE of:
//        a) Disjoint first-byte signatures (the dispatcher's primary
//           strategy — see emit/v2/dispatch.ts).
//        b) Distinct literal first-span text (the literal-match step on
//           the first span succeeds for at most one; mirrors v2's literal
//           expectLiteral failure path).
//        c) Distinct or DIVERGENT static fingerprints in subsequent spans:
//           the productions agree on byte 0 but diverge somewhere in their
//           fixed-shape spans (literals, class kinds, refinements, modifiers).
//           The bounded peek-scan (≤16 spans deep in current schemas) finds
//           the divergence position and speculation correctly disambiguates.
//        d) `.oneOf(...)` refinement: a tag-restricted ident pulls
//           tag-restricted alts ahead of catch-alls (mirrors v2's
//           `isRestricted` priority bit).
//        e) Fallthrough: one of the two has a non-byte-fixed first span
//           (.until/.rawUntil/.repeats/.optional/recursive). The dispatcher
//           reserves these for the catch-all path AFTER all byte-discriminated
//           alts have failed. (Two fallthrough alts in the same node type
//           run via declaration-ordered speculation; we accept that as
//           authored priority rather than flagging it.)
//
//   2. checkTotalDispatch        (3.2)
//      For schemas declaring `unknownChars: 'tolerate'` (silent skip of
//      unknown bytes), the dispatcher needs a way to ADVANCE PAST those
//      bytes — which exists only when there's a fallthrough production
//      at the root. Without one, 'tolerate' is structurally impossible
//      (the dispatcher returns null on uncovered bytes and the surrounding
//      parser stalls). We flag this at codegen.
//      Under `unknownChars: 'fail'` (default), uncovered bytes become
//      parse errors — that's a valid outcome, so totality is not required.
//      We restrict the check to the SCHEMA ROOT because non-root nodes
//      are reached from a parent's recursive-role dispatch where the
//      parent has already filtered which bytes route here — a non-root
//      returning null on an uncovered byte is the expected fail-up.
//
// Why this lives downstream of `validate` + `attachRenderTargets` +
// `deriveInverses` and BEFORE codegen: the dispatch logic operates on
// resolved spans (recursive-role resolution must be complete). Codegen
// would otherwise have to apologize for ambiguity it can't statically
// reason about.
//
// Why we don't also re-do the inverse-direction analysis here:
// `infer/invert.ts::validateInverseDiscrimination` is the inverse-direction
// analog — same property statement but on the value-shape side. The two
// checks are intentionally separate (forward = byte-prefix + structural
// fingerprint; inverse = value-shape) because they use orthogonal
// information.
//
// Relationship to the markdown schema's `ORDER NOTE` comments:
// the markdown schema documents two places where productions sharing a
// first byte rely on declaration order plus the dispatcher's longest-
// literal-prefix bucketing. After this check runs and asserts those alts
// are statically discriminable via the fingerprint divergence, the
// ORDER NOTE comments become redundant — Task 3.4 removes them.

import {
  CompilerError,
  type InferredSchema,
  type NodeTypeInfo,
  type Production,
  type ResolvedSpan,
} from '../model.ts';
import { classFirstBytes } from '../emit/v2/role-ladder.ts';
import { findModifier, hasModifier } from '../emit/v2/span.ts';

// --- Public API ------------------------------------------------------------

// Entry point: runs both checks. Throws CompilerError on first violation.
// (We could collect issues and surface them all at once; the call site
// is the inferSchema pipeline, where one failure is enough to refuse
// codegen, so fail-fast keeps the error message focused.)
export function checkDispatch(schema: InferredSchema): void {
  for (const info of schema.nodeTypes.values()) {
    if (info.productions.length <= 1) continue;
    const sigs = info.productions.map((p) => firstByteSignature(p));
    checkFirstByteConflicts(info, sigs);
    checkTotalDispatch(schema, info, sigs);
  }
}

// --- Production first-byte signature --------------------------------------

// A production's parse-time signature, derived purely from its FIRST span.
// Mirrors the same shape used by the v2 dispatcher and the interpreter's
// `orderProductionsForDispatch`. Three disjoint kinds:
//
//   - 'literal':  first span is a literal with fixed text. `bytes` is the
//                 singleton set of `text.charCodeAt(0)`; `literal` is the
//                 full literal text (used for distinct-literal discrimination).
//
//   - 'class':    first span is a class span (ident/number/hex/string/comment)
//                 without `until/rawUntil/repeats/optional`. `bytes` is the
//                 class's start-byte set (per `classFirstBytes`). `restricted`
//                 is true iff the first span itself has a `.oneOf(...)`
//                 refinement (which pins the accepted token set).
//
//   - 'fallthrough':  first span has `until/rawUntil/repeats/optional` or is
//                     a recursive-role span. Matches any byte; cannot be
//                     byte-discriminated. Tried by the dispatcher only after
//                     all byte-led alts fail (see emit/v2/dispatch.ts and
//                     emit/v2/role-ladder.ts for the protocol).
type Signature =
  | { readonly kind: 'literal'; readonly bytes: ReadonlySet<number>; readonly literal: string }
  | { readonly kind: 'class'; readonly bytes: ReadonlySet<number>; readonly cls: string; readonly oneOf: ReadonlyArray<string> | null }
  | { readonly kind: 'fallthrough'; readonly bytes: ReadonlySet<number> };

function firstByteSignature(prod: Production): Signature {
  const s0 = prod.spans[0];
  // Defensive — productions are required to have ≥1 span by `validate`.
  // If somehow not, treat as a fallthrough so the caller's pair-loop sees
  // a non-conflicting signature.
  if (!s0) {
    return { kind: 'fallthrough', bytes: new Set() };
  }
  // Spans with non-byte-fixed first-shape go to fallthrough. Matches the
  // ordering in `orderProductionsForDispatch` (interp/parse.ts:112).
  if (
    findModifier(s0, 'until')
    || findModifier(s0, 'rawUntil')
    || findModifier(s0, 'repeats')
    || hasModifier(s0, 'optional')
    || s0.recursiveRoles.length > 0
  ) {
    return { kind: 'fallthrough', bytes: new Set() };
  }
  if (s0.class === 'literal' && typeof s0.text === 'string' && s0.text.length > 0) {
    const bytes = new Set<number>([s0.text.charCodeAt(0)]);
    return { kind: 'literal', bytes, literal: s0.text };
  }
  // Class span — derive byte set from the class kind. `classFirstBytes`
  // throws if it sees an unsupported class; we wrap the throw with the
  // node context so the failure mode names the offending production.
  let bytes: ReadonlySet<number>;
  try {
    bytes = classFirstBytes(s0);
  } catch (e) {
    // Surface as an internal compiler error — every span class used as a
    // production's first span MUST be representable for dispatch.
    throw new CompilerError(
      `dispatch check: production starting with class '${s0.class}' span cannot be analyzed for first-byte signature: ${(e as Error).message}`,
    );
  }
  return { kind: 'class', bytes, cls: s0.class, oneOf: extractOneOf(s0) };
}

// --- Structural fingerprint -----------------------------------------------

// A static structural element used by the fingerprint divergence check.
// Computed per-span, captures the byte-level commitments a production makes
// regardless of WHICH input matches — two productions whose fingerprints
// diverge at some position can be told apart by trying both and watching
// for the first divergence to reject one of them. Fingerprints elide
// `until/rawUntil/repeats/recursive` spans (they accept open-ended input
// so don't constrain), with one important exception: a fallthrough first
// span makes the WHOLE production a fallthrough (handled at the signature
// layer), but a fallthrough span LATER in the production is just open
// content that doesn't help discriminate against another production —
// we record a sentinel 'open' element so a downstream literal/class span
// can still discriminate.
type Element =
  | { readonly kind: 'literal'; readonly text: string }
  | { readonly kind: 'class'; readonly cls: string; readonly oneOf: ReadonlyArray<string> | null }
  | { readonly kind: 'open' };

// Building the fingerprint walks the production's spans in order. We bound
// the walk at MAX_FINGERPRINT_DEPTH to bound the analysis cost — in
// practice production span counts are <20.
const MAX_FINGERPRINT_DEPTH = 32;

function structuralFingerprint(prod: Production): ReadonlyArray<Element> {
  const out: Element[] = [];
  for (let i = 0; i < prod.spans.length && i < MAX_FINGERPRINT_DEPTH; i++) {
    const span = prod.spans[i]!;
    out.push(spanElement(span));
  }
  return out;
}

function spanElement(span: ResolvedSpan): Element {
  // Open-ended span shapes — these accept arbitrary content and don't
  // constrain the input bytes. We record 'open' so a downstream literal
  // can still serve as a discriminator boundary.
  if (
    findModifier(span, 'until')
    || findModifier(span, 'rawUntil')
    || findModifier(span, 'repeats')
    || hasModifier(span, 'optional')
    || span.recursiveRoles.length > 0
  ) {
    return { kind: 'open' };
  }
  if (span.class === 'literal' && typeof span.text === 'string' && span.text.length > 0) {
    return { kind: 'literal', text: span.text };
  }
  return { kind: 'class', cls: span.class, oneOf: extractOneOf(span) };
}

function extractOneOf(span: ResolvedSpan): ReadonlyArray<string> | null {
  for (const ref of span.refinements) {
    if (ref.name === 'oneOf') {
      const args = ref.args?.[0];
      if (Array.isArray(args) && args.every((x) => typeof x === 'string')) {
        return (args as ReadonlyArray<string>).map((s) => s.toLowerCase());
      }
    }
  }
  return null;
}

// Element equality used by the fingerprint divergence check. Two elements
// are EQUIVALENT (no divergence at this position) when:
//   - both 'literal' with identical text
//   - both 'class' with same cls AND same oneOf set (null on both, or sets
//     that intersect — intersection means both productions accept some
//     common input here, so they DON'T diverge yet)
//   - both 'open' (open content matches anything; no constraint)
// They're DIVERGENT (productions can be told apart at this position) when:
//   - 'literal' vs 'literal' with different text
//   - 'literal' vs 'class' (specific text vs broad acceptance — the literal
//     succeeds on at most one input; the class on many. The dispatcher tries
//     each production; the literal-led one accepts only its specific text,
//     the class-led one accepts a broader range. Inputs matching the literal
//     are accepted by BOTH (the class consumes the literal text as a valid
//     class match), which is itself a tie — but the literal production
//     succeeds with a specific commitment, so speculation picks it up if
//     ordered first; otherwise the class production wins. The divergence
//     here is REAL: at least one input distinguishes them.)
//   - 'class' vs 'class' with different cls OR with oneOf sets that have
//     empty intersection
//   - either is 'open' and the other isn't — the 'open' one accepts
//     anything, the specific one only specific input. NOT divergence in the
//     fingerprint-divergence sense: the specific one is a subset of the
//     open one, so any input accepted by the specific is also accepted by
//     the open. The two CAN both match the same input — this is a real
//     ambiguity unless the productions diverge later.
function elementsCouldBothMatch(a: Element, b: Element): boolean {
  // 'open' matches anything; both-open or one-open trivially share inputs.
  if (a.kind === 'open' || b.kind === 'open') return true;
  if (a.kind === 'literal' && b.kind === 'literal') {
    return a.text === b.text;
  }
  if (a.kind === 'class' && b.kind === 'class') {
    if (a.cls !== b.cls) return false;
    if (a.oneOf === null || b.oneOf === null) return true;
    // Both restricted: intersect the value sets.
    for (const v of a.oneOf) if (b.oneOf.includes(v)) return true;
    return false;
  }
  // Literal vs class: the literal text is accepted by the class iff the
  // class can scan the literal text without violating refinements. We
  // approximate by checking the literal's first byte against the class's
  // start-byte set. (A tighter check would simulate scanClass against the
  // literal text — but for the practical cases the byte-set test catches
  // every relevant overlap.)
  const lit = a.kind === 'literal' ? a : (b as Extract<Element, { kind: 'literal' }>);
  const cls = a.kind === 'class' ? a : (b as Extract<Element, { kind: 'class' }>);
  if (lit.text.length === 0) return true;
  if (cls.oneOf !== null) {
    return cls.oneOf.includes(lit.text.toLowerCase());
  }
  // Approximation: do the literal's bytes fit in the class's character set?
  // Build a sample class signature (start bytes only) and check the
  // literal's first byte. This is sound for the AMBIGUITY direction (false
  // positives = we say they could share an input when they actually don't,
  // which is the SAFE bias for an "is there a divergence?" check — it
  // pushes the divergence later, leading to a stricter check, not weaker).
  const probeSpan: ResolvedSpan = {
    class: cls.cls as ResolvedSpan['class'],
    refinements: [],
    modifiers: [],
    recursiveRoles: [],
  };
  let firstBytes: ReadonlySet<number>;
  try {
    firstBytes = classFirstBytes(probeSpan);
  } catch {
    // Unsupported class — over-approximate: assume overlap. The check
    // gets stricter (more rejections), which is the safer direction.
    return true;
  }
  return firstBytes.has(lit.text.charCodeAt(0));
}

// Two productions are STATICALLY DISCRIMINABLE when they either:
//   (a) DIVERGE at some position — no single input can satisfy both
//       elements at that position (e.g. literal "X" vs literal "Y"), OR
//   (b) DIFFER in specificity at some position — one element is strictly
//       more restrictive than the other (literal where the other has
//       'open', oneOf-restricted class where the other is unrestricted,
//       etc.). The dispatcher's priority order (restricted-first, then
//       longest-literal-prefix, then span-count-descending — see
//       emit/v2/dispatch.ts::emitGroupSpeculation) GUARANTEES the more-
//       specific production is tried first. So the only inputs accepted
//       by the LESS-specific production are those rejected by the
//       more-specific — speculation correctly picks one.
//
// When neither divergence nor specificity-asymmetry exists at any
// position within the bound, the productions are STATIC-AMBIGUOUS — they
// would tie on every dispatcher priority and resolve by declaration order
// alone, which the spec does NOT guarantee.
function fingerprintsDiscriminable(
  a: ReadonlyArray<Element>,
  b: ReadonlyArray<Element>,
): boolean {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    // True divergence: no single input satisfies both elements at this
    // position. Speculation correctly distinguishes (try both; only one
    // succeeds).
    if (!elementsCouldBothMatch(ai, bi)) return true;
    // Specificity asymmetry: one element is strictly more restrictive
    // than the other. The dispatcher's restricted-first / longer-prefix
    // priority guarantees the more-specific one tries first.
    if (specificityRank(ai) !== specificityRank(bi)) return true;
  }
  // One production extends the other with concrete spans. The shorter
  // production is the LESS-specific (it makes fewer commitments); the
  // dispatcher's span-count-descending tiebreaker tries the longer one
  // first. Discriminable.
  if (a.length !== b.length) return true;
  return false;
}

// Higher rank = more specific = the dispatcher would try this production
// first when ranks differ at some position. Used to detect specificity
// asymmetry between fingerprints. The exact integer values don't matter,
// only the ordering.
function specificityRank(el: Element): number {
  switch (el.kind) {
    case 'literal':
      // A literal is the most specific: it accepts exactly one byte string.
      return 3;
    case 'class':
      // A restricted (.oneOf) class is more specific than an unrestricted
      // one but still less specific than a literal.
      return el.oneOf !== null ? 2 : 1;
    case 'open':
      // 'open' (until/repeats/recursive) accepts anything — least specific.
      return 0;
  }
}

// --- First-byte conflict check (Task 3.3) ---------------------------------

// Walks every pair (i, j) of productions in a node type. A pair is a
// conflict when their signatures share at least one first byte AND their
// structural fingerprints don't diverge within bounded depth. The
// dispatcher's discrimination toolbox (mirrored here):
//
//   1. Disjoint first bytes: trivial dispatch — no overlap.
//   2. Distinct literal first-span text (different bytes anywhere in the
//      first span's literal): the literal-match either succeeds or fails
//      atomically — at most one production accepts the first-span input.
//   3. Same first byte, divergent fingerprint downstream: speculation
//      correctly picks one. The divergence guarantees no single input is
//      accepted by both.
//   4. Restricted (.oneOf) on the first span pulls subset-accepting
//      productions ahead — handled inside `elementsCouldBothMatch`.
//   5. Fallthrough placement: handled at the signature level — never
//      conflicts with a byte-led signature.
function checkFirstByteConflicts(
  info: NodeTypeInfo,
  sigs: ReadonlyArray<Signature>,
): void {
  // Pre-compute fingerprints once per production — used pairwise below.
  const fingerprints = info.productions.map((p) => structuralFingerprint(p));
  for (let i = 0; i < sigs.length; i++) {
    for (let j = i + 1; j < sigs.length; j++) {
      const a = sigs[i]!;
      const b = sigs[j]!;
      // Fallthrough vs byte-led: the dispatcher reserves fallthroughs for
      // the catch-all path. Two fallthroughs share the catch-all but the
      // dispatcher runs them in declaration order — we accept that.
      if (a.kind === 'fallthrough' || b.kind === 'fallthrough') continue;
      // Byte overlap = the precondition for considering this pair.
      let sharedByte = false;
      for (const byte of a.bytes) {
        if (b.bytes.has(byte)) { sharedByte = true; break; }
      }
      if (!sharedByte) continue;
      // Distinct literal text fully discriminates at the first span.
      if (a.kind === 'literal' && b.kind === 'literal' && a.literal !== b.literal) {
        continue;
      }
      // Look for divergence OR specificity asymmetry anywhere in the
      // structural fingerprint.
      if (fingerprintsDiscriminable(fingerprints[i]!, fingerprints[j]!)) continue;
      // No divergence found — the pair is statically ambiguous.
      const pa = info.productions[i]!;
      const pb = info.productions[j]!;
      throw new CompilerError(
        `dispatch ambiguity: node '${info.name}' has two productions with identical static fingerprint and overlapping first-byte signature: `
        + `${describeProd(pa, i)} vs ${describeProd(pb, j)}. `
        + `Both productions can accept the same input prefix without further static discrimination, so the dispatcher would fall back to declaration order — which the spec does not guarantee. `
        + `Add a .oneOf(...) refinement on a discriminating span, change one production's first literal to a longer-prefix punctuator that the other can't match, or convert one production's first span to a fallthrough (.until/.repeats/.optional).`,
      );
    }
  }
}

// --- Total-dispatch check (Task 3.2) --------------------------------------

// Total dispatch at the schema root: every input byte must reach SOME
// outcome — a matching production, a fallthrough, or a parse error.
//
// In the parse-time semantics:
//   - When `unknownChars: 'fail'` (the default), an uncovered byte at the
//     root causes a SyntaxError. That's a valid outcome — the caller sees
//     a parse failure rather than silent miss. No check needed.
//   - When `unknownChars: 'tolerate'`, the runtime is supposed to SKIP
//     unrecognized bytes silently. But "skip" presupposes the dispatcher
//     has a way to advance past them — which it does only via a
//     fallthrough production that consumes arbitrary content. Without
//     such a fallthrough, the 'tolerate' policy is a lie: the dispatcher
//     returns null on uncovered bytes and the surrounding parser stalls
//     (no advancement, no progress). Surface this at codegen.
//
// We restrict the check to the SCHEMA ROOT because non-root nodes are
// reached from a parent's recursive-role dispatch where the parent has
// already filtered which bytes route here. A non-root node returning null
// on an uncovered byte is the EXPECTED behavior — its parent picks up.
//
// The current in-scope schemas pass: html and markdown declare
// `unknownChars: 'tolerate'` AND have a paragraph/text-leaf fallthrough
// at their root types (via MarkdownLeaf and similar). CSS uses default
// 'fail' so totality isn't enforced — uncovered bytes cause parse errors.
function checkTotalDispatch(
  schema: InferredSchema,
  info: NodeTypeInfo,
  sigs: ReadonlyArray<Signature>,
): void {
  // The 'fail' policy turns uncovered bytes into SyntaxError — that's a
  // valid outcome. No totality required.
  if (schema.unknownChars !== 'tolerate') return;
  // Restrict to the schema root — non-root nodes intentionally fail-up
  // to their caller on uncovered bytes.
  if (info.name !== schema.rootType) return;
  // 'tolerate' requires a way to advance past unknown bytes. The only
  // mechanism in the current dispatcher is a fallthrough production
  // whose first span accepts arbitrary content (.until/.rawUntil/
  // .repeats/.optional/recursive). When the root has NO such
  // fallthrough AND its byte-led productions don't cover all bytes,
  // tolerance is structurally impossible.
  if (sigs.some((s) => s.kind === 'fallthrough')) return;
  const covered = new Set<number>();
  for (const sig of sigs) {
    for (const b of sig.bytes) covered.add(b);
  }
  // Whitespace bytes are always skipped by the dispatcher's leading
  // skipWs (emit/v2/dispatch.ts), so they're "covered" implicitly.
  for (const ws of [0x20, 0x09, 0x0a, 0x0d]) covered.add(ws);
  if (covered.size === 256) return;
  // Identify a sample of uncovered bytes for the error message.
  const uncovered: number[] = [];
  for (let b = 0; b < 256 && uncovered.length < 6; b++) {
    if (!covered.has(b)) uncovered.push(b);
  }
  throw new CompilerError(
    `dispatch totality: root node '${info.name}' declares unknownChars: 'tolerate' but has no fallthrough production AND its byte-led productions do not cover all input bytes. `
    + `Uncovered bytes include: ${uncovered.map((b) => `0x${b.toString(16)}`).join(', ')}. `
    + `Either add a catch-all production with a .until/.repeats first span so unknown bytes can be tolerated, OR set unknownChars: 'fail' so unknown bytes become parse errors.`,
  );
}

// --- Helpers ---------------------------------------------------------------

function describeProd(prod: Production, idx: number): string {
  const example = prod.source.input;
  const truncated = example.length <= 40 ? example : `${example.slice(0, 37)}...`;
  return `production #${idx} (example ${JSON.stringify(truncated)})`;
}

// Re-export of helpers used by tests so they can synthesize signatures
// for unit-style checks. Kept private otherwise — the public API is the
// `checkDispatch` entry point.
export const __testing = {
  firstByteSignature,
  structuralFingerprint,
  fingerprintsDiscriminable,
};
