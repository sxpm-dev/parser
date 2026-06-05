// Round-trip closure theorem at codegen (Task 3.1).
//
// Property (spec rule 5 — value-stable round-trip):
//
//     For every (production p, declared render target t, example input i):
//       let v  = render(parse(i),       t)         // forward render
//       let s  = stringify(v,           t)         // inverse render
//       let v' = render(parse(s),       t)         // re-forward
//       assert deep_equal(v, v')                   // modulo source positions
//
// This is exactly the property v2's `assertRoundTrip` (packages/parser)
// asserts on each package's curated fixture set at downstream test time —
// pulled forward here so the compiler refuses to emit code whose declared
// schema examples cannot round-trip. Catching a violation at codegen is
// strictly better than catching it as a downstream test failure: the
// generated parser never exists.
//
// Why value-stable (not byte-stable / AST-stable):
//
//   - byte-stable is too strict: every language has many-to-one renderings
//     (markdown's `---`, `***`, `___` all → `<hr>` for the html target).
//   - AST-stable is too strict for the same reason: re-parsing a canonical
//     `<hr>` will pick exactly one hr production, not the original input's
//     production index.
//   - value-stable is the right granularity: it says "rendering the
//     re-parsed output yields the same target value", which is the
//     property downstream consumers actually rely on when they round-trip
//     ASTs (parse → modify → stringify → re-parse for further edits).
//
// Why the AST target is skipped:
//
//   - The 'ast' target carries `source` byte-range metadata that the
//     interpreter intentionally does not recompute (interp's source field
//     differs from v2's by design — see interp/parse.ts header). The v2
//     codegen's `assertRoundTrip(mod, 'ast', ...)` works because both
//     sides use the same v2 parser; here we'd be cross-checking interp
//     vs interp, where 'ast' stripping is the wrong granularity. The
//     existing downstream `round-trip.test.ts` files exercise the 'ast'
//     target end-to-end against the v2 codegen.
//
// Why recovery productions are skipped:
//
//   - A production marked `.recovers({...})` is only attempted when every
//     valid production has failed; its example is the malformed-input
//     test case for recovery, not a round-trip candidate. The recovered
//     AST is by definition lossy.
//
// Relationship to the differential fuzzer corpus
// (packages/compiler/test/fuzz-corpus/):
//
//   - The fuzzer found 16 css + 7 markdown round-trip mismatches on
//     MUTATED inputs (truncate/duplicate/insert-noise transforms applied
//     to seed corpora). Those are not examples — they're synthesized
//     stress inputs whose failures track interp/v2 robustness gaps. The
//     check here runs only on schema examples; the fuzzer corpus stays
//     a separate, broader testbed.
//
// Known-broken exception list (KNOWN_EXCLUSIONS):
//
//   When fixing the underlying schema/interpreter/v2 issue is out of
//   scope for the change introducing this check, we mark the (nodeType,
//   target, input) tuple as a known exclusion with a doc-comment
//   referencing the follow-up. Phase-3+ work shrinks this list to empty.

import {
  CompilerError,
  type InferredSchema,
  type Production,
} from '../model.ts';
import { interpretParseCaptures } from '../interp/parse.ts';
import { interpretRender } from '../interp/render.ts';
import { interpretStringify } from '../interp/stringify.ts';

// --- Public API ------------------------------------------------------------

export function checkRoundTrip(schema: InferredSchema): void {
  for (const info of schema.nodeTypes.values()) {
    for (let pi = 0; pi < info.productions.length; pi++) {
      const production = info.productions[pi]!;
      // Recovery productions describe lossy malformed-input fallbacks.
      // The recovered AST is not expected to re-encode.
      if (production.recovery) continue;
      checkProduction(schema, info.name, pi, production);
    }
  }
}

// --- Per-production check -------------------------------------------------

function checkProduction(
  schema: InferredSchema,
  nodeName: string,
  prodIdx: number,
  production: Production,
): void {
  const example = production.source.input;

  // Step 1: forward-parse the example at the schema root.
  //
  // Examples can be either:
  //   (a) Root-parseable: a complete document fragment in the schema's
  //       surface syntax. These exercise the full pipeline and are
  //       candidates for round-trip checking.
  //   (b) Sub-tree fixtures: snippets like `key="value"` declared with
  //       `.as('Pair')` against a schema rooted at `Node`. These drive
  //       production-shape inference for a sub-node but cannot be parsed
  //       at the root. They're invisible to `render(input, opts)` —
  //       which is the only public parse entry point — so a round-trip
  //       property is meaningless here. We skip silently.
  //
  // If a schema author actually wanted (b) to round-trip from root,
  // they'd need to wrap it in the root production manually; the absence
  // of such wrapping is the signal that this is a sub-tree fixture.
  let captures: ReturnType<typeof interpretParseCaptures>;
  try {
    captures = interpretParseCaptures(schema, example);
  } catch {
    return;
  }
  // Additional gate: the parse must have actually exercised this
  // production (not e.g. a recovery production with the same surface
  // form). When the example doesn't dispatch to this production from
  // the root, we're not checking what the schema author declared this
  // example to do; skip rather than report a misleading failure.
  if (captures.__production !== `${nodeName}#${prodIdx}` &&
      !producesNested(captures, `${nodeName}#${prodIdx}`)) {
    return;
  }

  for (const [target, renderEntry] of production.renders) {
    // Skip 'ast' (and any target whose body is structurally identical to
    // an ast-style structured object) — see the header comment for why
    // (source-position metadata + class-stripped capture values make the
    // interp↔interp comparison the wrong granularity). Schemas declaring
    // a `json` target as an alias of `ast` inherit the same caveat.
    if (target === 'ast' || target === 'json') continue;

    // Skip targets with an explicit `options.inverse` override. The
    // override means the schema author asserts their own inverse
    // correctness; the override may use different literal segments from
    // the forward body (the typical reason to provide one), which
    // would inherently break a body↔inverse round-trip check.
    // Round-trip correctness of overrides is the author's responsibility,
    // exercised by their package-level round-trip tests.
    if (renderEntry.inverse !== undefined) continue;

    if (isKnownException(nodeName, target, example)) continue;

    checkOneTarget(schema, nodeName, prodIdx, example, captures, target);
  }
}

function checkOneTarget(
  schema: InferredSchema,
  nodeName: string,
  prodIdx: number,
  example: string,
  captures: ReturnType<typeof interpretParseCaptures>,
  target: string,
): void {
  // Step 2: forward-render to the target.
  let original: unknown;
  try {
    original = interpretRender(schema, captures, target);
  } catch (e) {
    throw new CompilerError(
      `round-trip check: render failed for target '${target}' on example`
        + ` ${truncate(JSON.stringify(example))} from production ${nodeName}#${prodIdx}: ${(e as Error).message}`,
    );
  }

  // Step 3: inverse — stringify the rendered value back to source.
  let stringified: string;
  try {
    stringified = interpretStringify(schema, original, target);
  } catch (e) {
    throw new CompilerError(
      `round-trip check: stringify failed for target '${target}' on example`
        + ` ${truncate(JSON.stringify(example))} from production ${nodeName}#${prodIdx}:`
        + ` ${(e as Error).message}\n  rendered value: ${truncate(safeJson(original))}`,
    );
  }

  // Step 4: re-parse the stringified source.
  let reCaptures: ReturnType<typeof interpretParseCaptures>;
  try {
    reCaptures = interpretParseCaptures(schema, stringified);
  } catch (e) {
    throw new CompilerError(
      `round-trip check: reparse failed for target '${target}' on example`
        + ` ${truncate(JSON.stringify(example))} from production ${nodeName}#${prodIdx}\n`
        + `  original input: ${JSON.stringify(example)}\n`
        + `  stringified:    ${JSON.stringify(stringified)}\n`
        + `  reparse error:  ${(e as Error).message}`,
    );
  }

  // Step 5: re-render and compare against the original target value.
  let reRendered: unknown;
  try {
    reRendered = interpretRender(schema, reCaptures, target);
  } catch (e) {
    throw new CompilerError(
      `round-trip check: re-render failed for target '${target}' on example`
        + ` ${truncate(JSON.stringify(example))} from production ${nodeName}#${prodIdx}: ${(e as Error).message}`,
    );
  }

  // Value-stable comparison, modulo `source` byte-range metadata.
  if (!deepEqual(stripSource(original), stripSource(reRendered))) {
    throw new CompilerError(
      `round-trip check: target value not value-stable across stringify/reparse`
        + ` for target '${target}' on example ${truncate(JSON.stringify(example))}`
        + ` from production ${nodeName}#${prodIdx}\n`
        + `  original input: ${JSON.stringify(example)}\n`
        + `  stringified:    ${JSON.stringify(stringified)}\n`
        + `  original value: ${truncate(safeJson(stripSource(original)))}\n`
        + `  re-rendered:    ${truncate(safeJson(stripSource(reRendered)))}`,
    );
  }
}

// --- Known exceptions ------------------------------------------------------

// Documented schema-level limitations carried over from Phase-2 work.
// Every entry MUST cite the tracking work that resolves it. The list
// shrinks (ideally to empty) as Phase-3+ tasks close out.
type Exclusion = {
  readonly nodeType: string;
  readonly target: string;
  readonly input: string;
  readonly reason: string;
};

const KNOWN_EXCLUSIONS: ReadonlyArray<Exclusion> = [
  // CSS Comment source-render produces only the interior text (delimiters
  // are stripped by `.comment()` during parse but not re-added on
  // rebuild). The schema header at packages/css/src/schema.ts:166 calls
  // this out as a Phase 7 follow-up. Fixing it requires either:
  //   (a) a compiler-side synthesis rule that re-adds `/*` `*/` around
  //       `.comment()` slots on inverse, or
  //   (b) splitting the Comment span into three (open delim / interior
  //       text / close delim).
  // Either belongs in a separate commit.
  {
    nodeType: 'Comment',
    target: 'source',
    input: '/* foo */',
    reason: 'comment-delimiter strip/restore — Phase 7 follow-up',
  },
];

function isKnownException(nodeName: string, target: string, input: string): boolean {
  for (const e of KNOWN_EXCLUSIONS) {
    if (e.nodeType === nodeName && e.target === target && e.input === input) return true;
  }
  return false;
}

// --- Helpers ---------------------------------------------------------------

// Walks a captures tree looking for a child whose __production matches.
// Used to confirm the example actually exercises the production we're
// checking — without this, a Pair example accidentally consumed inside
// a Node parse would pass the root check but never report on Pair#0's
// own round-trip behavior.
function producesNested(captures: unknown, productionKey: string): boolean {
  if (captures === null || typeof captures !== 'object') return false;
  if (Array.isArray(captures)) {
    for (const v of captures) if (producesNested(v, productionKey)) return true;
    return false;
  }
  const obj = captures as Record<string, unknown>;
  if (obj.__production === productionKey) return true;
  for (const v of Object.values(obj)) {
    if (producesNested(v, productionKey)) return true;
  }
  return false;
}

function stripSource(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(stripSource);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === 'source') continue;
    out[k] = stripSource(v);
  }
  return out;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const ak = Object.keys(a as Record<string, unknown>).sort();
  const bk = Object.keys(b as Record<string, unknown>).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return false;
    if (
      !deepEqual(
        (a as Record<string, unknown>)[ak[i]!],
        (b as Record<string, unknown>)[bk[i]!],
      )
    ) {
      return false;
    }
  }
  return true;
}

function truncate(s: string): string {
  return s.length <= 200 ? s : `${s.slice(0, 197)}...`;
}

function safeJson(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}
