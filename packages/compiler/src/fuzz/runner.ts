// Differential fuzzer runner. For one (schema, target, input) it cross-
// checks three pipelines:
//   1. interpretParse → interpretRender(target) vs v2's render(input, target)
//   2. interpretRender → interpretStringify(target) then re-render: value-
//      stable round-trip property via the interpreter
//   3. (skipped — covered by the v2 round-trip tests in each package)
//
// On divergence the runner returns a structured report so the CLI / test
// harness can save a minimal failing seed and continue. The runner never
// throws on divergence; it converts thrown errors into structured reports
// too (an "interp threw / v2 didn't" or vice versa).

import type { InferredSchema } from '../model.ts';
import { interpretParse } from '../interp/parse.ts';
import { interpretRender } from '../interp/render.ts';
import { interpretStringify } from '../interp/stringify.ts';
import { interpretParseCaptures } from '../interp/parse.ts';

// --- Public API ------------------------------------------------------------

export type SchemaSetup = {
  readonly name: string;
  readonly schema: InferredSchema;
  readonly render: V2Render;
  // Seed corpus for this schema. The caller is responsible for supplying
  // it (so the corpus selection lives next to the schema imports it
  // mirrors, rather than coupling the compiler's tsc'd source tree to
  // each downstream package's filesystem layout).
  readonly seedCorpus: ReadonlyArray<string>;
  // Targets the fuzzer should compare. Restrict to targets we know are
  // round-trippable for that schema (e.g. CSS 'source' but not 'ast' for
  // round-trip — the source field on AST nodes is byte-position metadata
  // that the interpreter does not recompute identically).
  readonly equivalenceTargets: ReadonlyArray<string>;
  readonly roundTripTargets: ReadonlyArray<string>;
};

export type V2Render = (
  input: string,
  options?: { type?: string },
) => unknown;

export type Divergence = {
  readonly schema: string;
  readonly mutator: string;
  readonly seed: string;
  readonly input: string;
  readonly kind: DivergenceKind;
  readonly target?: string;
  readonly detail: string;
  // Optional snapshots for the report. Stringified shallowly to avoid
  // dragging entire AST objects into the JSON output.
  readonly interpValue?: unknown;
  readonly v2Value?: unknown;
};

export type DivergenceKind =
  | 'parse-divergence-interp-threw'
  | 'parse-divergence-v2-threw'
  | 'ast-mismatch'
  | 'render-mismatch'
  | 'round-trip-mismatch'
  | 'interp-internal-error';

export type CompareInput = {
  readonly mutator: string;
  readonly seed: string;
  readonly input: string;
};

// Strip 'source' fields recursively. The reference interpreter doesn't
// recompute byte-for-byte source ranges; AST equivalence is structural.
export function stripSource(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(stripSource);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'source') continue;
    out[k] = stripSource(v);
  }
  return out;
}

// Deep structural equality. Used over the AST trees and rendered values.
export function deepEqual(a: unknown, b: unknown): boolean {
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

// --- The comparison ------------------------------------------------------

export function compareOne(
  setup: SchemaSetup,
  candidate: CompareInput,
): Divergence | null {
  const { schema, render, name } = setup;
  const { input } = candidate;

  // 1. Parse via both routes. Failures on one and success on the other
  //    are divergences; failures on both are silently accepted (consistent
  //    rejection).
  let interpAst: unknown;
  let interpThrew = false;
  try {
    interpAst = interpretParse(schema, input);
  } catch {
    interpThrew = true;
  }
  let v2Ast: unknown;
  let v2Threw = false;
  try {
    v2Ast = render(input, { type: 'ast' });
  } catch {
    v2Threw = true;
  }
  if (interpThrew && !v2Threw) {
    return divergence(name, candidate, 'parse-divergence-interp-threw', {
      detail: 'interp threw, v2 accepted',
      v2Value: shallowSnapshot(v2Ast),
    });
  }
  if (!interpThrew && v2Threw) {
    return divergence(name, candidate, 'parse-divergence-v2-threw', {
      detail: 'v2 threw, interp accepted',
      interpValue: shallowSnapshot(interpAst),
    });
  }
  if (interpThrew && v2Threw) {
    return null;
  }

  // 2. AST equivalence (modulo source positions).
  const stripped = {
    interp: stripSource(interpAst),
    v2: stripSource(v2Ast),
  };
  if (!deepEqual(stripped.interp, stripped.v2)) {
    return divergence(name, candidate, 'ast-mismatch', {
      detail: 'interp parse produced different AST than v2 parse',
      interpValue: shallowSnapshot(stripped.interp),
      v2Value: shallowSnapshot(stripped.v2),
    });
  }

  // 3. Render equivalence for each declared target. We use the interpreter's
  //    render path so the comparison is fully shape-aware (template fusion
  //    + array joining). The interp captures (not the stripped AST) are
  //    the canonical input — interpretRender reads __production keys.
  let interpCaptures: ReturnType<typeof interpretParseCaptures>;
  try {
    interpCaptures = interpretParseCaptures(schema, input);
  } catch (e) {
    return divergence(name, candidate, 'interp-internal-error', {
      detail: `interpretParseCaptures threw after interpretParse accepted: ${String((e as Error).message)}`,
    });
  }
  for (const target of setup.equivalenceTargets) {
    let fromInterp: unknown;
    let interpRenderThrew = false;
    try {
      fromInterp = interpretRender(schema, interpCaptures, target);
    } catch (e) {
      interpRenderThrew = true;
      return divergence(name, candidate, 'interp-internal-error', {
        target,
        detail: `interpretRender(${target}) threw: ${String((e as Error).message)}`,
      });
    }
    if (interpRenderThrew) continue;
    let fromV2: unknown;
    let v2RenderThrew = false;
    try {
      fromV2 = render(input, { type: target });
    } catch (e) {
      v2RenderThrew = true;
      return divergence(name, candidate, 'render-mismatch', {
        target,
        detail: `v2 render(${target}) threw after parse accepted: ${String((e as Error).message)}`,
        interpValue: shallowSnapshot(fromInterp),
      });
    }
    if (v2RenderThrew) continue;
    const sInterp = stripSource(fromInterp);
    const sV2 = stripSource(fromV2);
    if (!deepEqual(sInterp, sV2)) {
      return divergence(name, candidate, 'render-mismatch', {
        target,
        detail: `interp.render(${target}) differs from v2.render(${target})`,
        interpValue: shallowSnapshot(sInterp),
        v2Value: shallowSnapshot(sV2),
      });
    }
  }

  // 4. Round-trip via interpreter for each round-trip target. Stringify
  //    the rendered value, re-parse, re-render, compare to original.
  for (const target of setup.roundTripTargets) {
    let original: unknown;
    try {
      original = render(input, { type: target });
    } catch {
      continue;
    }
    let reconstructed: string;
    try {
      reconstructed = interpretStringify(schema, original, target);
    } catch (e) {
      return divergence(name, candidate, 'interp-internal-error', {
        target,
        detail: `interpretStringify(${target}) threw: ${String((e as Error).message)}`,
        v2Value: shallowSnapshot(original),
      });
    }
    let round: unknown;
    try {
      round = render(reconstructed, { type: target });
    } catch (e) {
      return divergence(name, candidate, 'round-trip-mismatch', {
        target,
        detail: `v2 re-parse threw on reconstructed source: ${String((e as Error).message)}; reconstructed=${JSON.stringify(reconstructed)}`,
        v2Value: shallowSnapshot(original),
      });
    }
    const sOriginal = stripSource(original);
    const sRound = stripSource(round);
    if (!deepEqual(sOriginal, sRound)) {
      return divergence(name, candidate, 'round-trip-mismatch', {
        target,
        detail: `round-trip via interp stringify+v2 reparse changed the rendered value`,
        interpValue: shallowSnapshot({ reconstructed, sRound }),
        v2Value: shallowSnapshot(sOriginal),
      });
    }
  }

  return null;
}

// --- Helpers ---------------------------------------------------------------

function divergence(
  schema: string,
  candidate: CompareInput,
  kind: DivergenceKind,
  extra: {
    readonly detail: string;
    readonly target?: string;
    readonly interpValue?: unknown;
    readonly v2Value?: unknown;
  },
): Divergence {
  return {
    schema,
    mutator: candidate.mutator,
    seed: candidate.seed,
    input: candidate.input,
    kind,
    target: extra.target,
    detail: extra.detail,
    interpValue: extra.interpValue,
    v2Value: extra.v2Value,
  };
}

// Truncate large value snapshots so reports stay readable. Mirrors what
// JSON.stringify with a depth limit would do — we keep the top level
// detailed (kinds + first-level fields) and collapse deeper recursion.
function shallowSnapshot(value: unknown, depth = 3): unknown {
  if (depth <= 0) return '<deep>';
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 16).map((v) => shallowSnapshot(v, depth - 1));
  }
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (count >= 32) {
      out['...'] = '<truncated>';
      break;
    }
    out[k] = shallowSnapshot(v, depth - 1);
    count++;
  }
  return out;
}
