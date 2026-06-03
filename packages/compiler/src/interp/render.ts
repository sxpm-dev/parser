// Reference interpreter — render path (Task 2.2). Given a captures object
// produced by `interpretParseCaptures` (carrying the `__production:
// "Node#<idx>"` routing key) and a target name, walk the production's
// render body for that target and return the rendered value.
//
// This mirrors emit/render.ts semantics exactly:
//   - Scalar bodies (null / number / string / boolean) return as-is.
//   - StructureRef bodies read from the captures dict via the same
//     synthetic-key scheme emit/captures.ts uses.
//     • span-value routes through the slot helper so recursive children
//       fold through the per-target dispatcher.
//     • span-presence returns a boolean (capture != null).
//     • Other synthetic refs (gap, raw, tail, endsWith, commentLeft/Right)
//       were populated at parse time by attachSyntheticRefs and read
//       directly here.
//   - Template bodies fuse into a string: parts[0] + slot0 + parts[1] +
//     slot1 + ... — with three nuances mirrored from emitTemplateExpr:
//       1. `.repeats()` arrays join with the span's declared separator
//          (NOT a hardcoded ' '); look it up via repeatsJoinDescriptor on
//          the owning production's span definition.
//       2. `.indent()`-modified `.repeats()` arrays join with the per-
//          level dynamic separator `'\n' + ' '.repeat(indentCol)` and add
//          a leading prefix when `indentCol > 0`. Children recurse at
//          `indentCol + INDENT_STEP_SPACES` so a nested indent block
//          knows the column its OWN children will land at.
//       3. Optional-absent slot fusion: when the captured value is
//          null/undefined AND the immediately-preceding part is purely
//          whitespace, both collapse to "" (avoids dangling separators).
//   - Object / Array bodies recurse over their children.
//
// Public surface:
//   - interpretRender(schema, captures, target): walk one captures object
//   - interpretRenderFromInput(schema, input, target): convenience parse+render
//
// Both functions intentionally take a `target` even when the schema has a
// defaultTarget — keep the dispatch explicit so the differential fuzzer
// can iterate targets without re-reading schema state.

import {
  isStructureRef,
  isTemplate,
  type RenderBody,
  type StructureRef,
  type Template,
} from '@parser2/parser';
import type { InferredSchema, Production } from '../model.ts';
import { findSpanByName, isAbsentAllowedSpan, repeatsJoinDescriptor } from '../span-helpers.ts';
import { INDENT_STEP_SPACES } from '../emit/rebuild.ts';
import { interpretParseCaptures } from './parse.ts';

// --- Public API ------------------------------------------------------------

export function interpretRender(
  schema: InferredSchema,
  captures: unknown,
  target: string,
): unknown {
  return renderSlot(schema, captures, target, 0);
}

export function interpretRenderFromInput(
  schema: InferredSchema,
  input: string,
  target: string,
): unknown {
  const captures = interpretParseCaptures(schema, input);
  return renderSlot(schema, captures, target, 0);
}

// --- Slot helper -----------------------------------------------------------

// Mirrors __renderSlot_<target> in the generated code. Routes captures
// objects through the per-target dispatcher; passes primitives through;
// maps arrays element-wise. Returning the value as-is for non-captures
// non-array values means the caller's surrounding concat handles
// stringification.
//
// `indentCol` is the column at which children of an indent-modified
// repeats span land. Passed through verbatim for non-indent slots and
// for array elements (the array-bearing slot already advanced indentCol
// for its children before calling here).
function renderSlot(
  schema: InferredSchema,
  value: unknown,
  target: string,
  indentCol: number,
): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => renderSlot(schema, v, target, indentCol));
  }
  if (typeof value === 'object') {
    const c = value as Record<string, unknown>;
    if (typeof c.__production === 'string') {
      return dispatchProduction(schema, c, target, indentCol);
    }
  }
  return value;
}

// Per-target dispatcher — looks up the production by its captures.__production
// key and walks the matching render body.
function dispatchProduction(
  schema: InferredSchema,
  captures: Record<string, unknown>,
  target: string,
  indentCol: number,
): unknown {
  const prodKey = captures.__production;
  if (typeof prodKey !== 'string') {
    throw new Error(`interp render: missing __production on captures (target '${target}')`);
  }
  const hashIdx = prodKey.lastIndexOf('#');
  if (hashIdx < 0) {
    throw new Error(`interp render: malformed __production '${prodKey}'`);
  }
  const nodeType = prodKey.slice(0, hashIdx);
  const prodIdx = Number(prodKey.slice(hashIdx + 1));
  const info = schema.nodeTypes.get(nodeType);
  if (!info) {
    throw new Error(`interp render: unknown node type '${nodeType}' (target '${target}')`);
  }
  const production = info.productions[prodIdx];
  if (!production) {
    throw new Error(`interp render: bad production index '${prodKey}'`);
  }
  const entry = production.renders.get(target);
  if (!entry) {
    throw new Error(`interp render: production '${prodKey}' has no '${target}' target`);
  }
  return walkBody(schema, entry.body, captures, target, production, indentCol);
}

// --- Body walker -----------------------------------------------------------

function walkBody(
  schema: InferredSchema,
  body: RenderBody,
  captures: Record<string, unknown>,
  target: string,
  production: Production,
  indentCol: number,
): unknown {
  if (body === null) return null;
  const t = typeof body;
  if (t === 'string') return body;
  if (t === 'number') {
    // Mirror emit/render.ts: non-finite numbers (NaN/Infinity) → null.
    return Number.isFinite(body as number) ? body : null;
  }
  if (t === 'boolean') return body;
  if (isStructureRef(body)) return readRef(schema, body, captures, target, indentCol);
  if (isTemplate(body)) return walkTemplate(schema, body, captures, target, production, indentCol);
  if (Array.isArray(body)) {
    return body.map((child) => walkBody(schema, child, captures, target, production, indentCol));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, RenderBody>)) {
    out[k] = walkBody(schema, v, captures, target, production, indentCol);
  }
  return out;
}

function readRef(
  schema: InferredSchema,
  ref: StructureRef,
  captures: Record<string, unknown>,
  target: string,
  indentCol: number,
): unknown {
  if (ref.__ref === 'span-presence') {
    return captures[ref.name] != null;
  }
  if (ref.__ref === 'span-value') {
    return renderSlot(schema, captures[ref.name], target, indentCol);
  }
  const key = syntheticKey(ref);
  return captures[key];
}

// --- Template walker -------------------------------------------------------

function walkTemplate(
  schema: InferredSchema,
  template: Template,
  captures: Record<string, unknown>,
  target: string,
  production: Production,
  indentCol: number,
): string {
  // Build the same `pieces` list emit/render.ts builds, then apply the
  // same optional-absent fusion before string-concat. Keeping the two
  // implementations structurally parallel makes drift between them easy
  // to spot.
  const { parts, slots } = template;

  type LiteralPiece = { readonly kind: 'literal'; readonly text: string };
  type SlotPiece = {
    readonly kind: 'slot';
    readonly value: string;
    readonly optional: boolean;
    readonly absent: boolean;
    readonly prevRaw: string; // raw text of the preceding part literal
  };
  type Piece = LiteralPiece | SlotPiece;
  const pieces: Piece[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length > 0) pieces.push({ kind: 'literal', text: part });
    if (i < slots.length) {
      const slot = slots[i]!;
      const raw = captures[slot.ref];
      const span = findSpanByName(production, slot.ref);
      const optional = span !== undefined && isAbsentAllowedSpan(span);
      const absent = raw === null || raw === undefined;

      let valueText: string;
      if (absent) {
        valueText = '';
      } else {
        const repeats = span !== undefined ? repeatsJoinDescriptor(span) : null;
        if (repeats !== null && repeats.kind === 'indent') {
          // Indent-modified repeats slot: dynamic per-level join +
          // leading prefix when nested. Mirrors emit/render.ts (Phase 7
          // follow-up #1). Children recurse at indentCol +
          // INDENT_STEP_SPACES so a child production with its OWN
          // indent slot receives the correct column for the level
          // below it.
          const childCol = indentCol + INDENT_STEP_SPACES;
          const joinSep = '\n' + ' '.repeat(indentCol);
          const leading = indentCol > 0 ? '\n' + ' '.repeat(indentCol) : '';
          if (Array.isArray(raw)) {
            const parts2: string[] = [];
            for (const child of raw) {
              const r = renderSlot(schema, child, target, childCol);
              if (r === null || r === undefined) continue;
              parts2.push(stringifyForConcat(r));
            }
            valueText = leading + parts2.join(joinSep);
          } else {
            const r = renderSlot(schema, raw, target, childCol);
            valueText = r === null || r === undefined ? '' : stringifyForConcat(r);
          }
        } else if (repeats !== null) {
          // Non-indent repeats slot: per-child render then join with the
          // span-declared separator. Fall back to scalar dispatch when
          // the capture isn't actually an array (e.g. .repeats({min:0})
          // with a sentinel scalar). indentCol is passed through
          // unchanged so a child production that DOES have an indent
          // slot still receives the correct ambient column.
          if (Array.isArray(raw)) {
            const parts2: string[] = [];
            for (const child of raw) {
              const r = renderSlot(schema, child, target, indentCol);
              if (r === null || r === undefined) continue;
              parts2.push(stringifyForConcat(r));
            }
            valueText = parts2.join(repeats.sep);
          } else {
            const r = renderSlot(schema, raw, target, indentCol);
            valueText = r === null || r === undefined ? '' : stringifyForConcat(r);
          }
        } else {
          const r = renderSlot(schema, raw, target, indentCol);
          valueText = r === null || r === undefined ? '' : stringifyForConcat(r);
        }
      }

      pieces.push({
        kind: 'slot',
        value: valueText,
        optional,
        absent,
        prevRaw: part,
      });
    }
  }

  // Apply optional-absent fusion: when an optional slot is absent AND the
  // preceding literal piece is pure whitespace, drop both. Otherwise the
  // slot already collapses to "" but the literal stays (matching the
  // null-coalesce-only branch of emitTemplateExpr).
  const fused: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!;
    if (piece.kind === 'literal') {
      fused.push(piece.text);
      continue;
    }
    if (!piece.optional || !piece.absent) {
      fused.push(piece.value);
      continue;
    }
    // Optional absent. Look at prevRaw (the part immediately before this
    // slot): if it's purely whitespace AND was pushed onto `fused` as the
    // most recent literal, drop both.
    const prevIsWhitespace = piece.prevRaw.length > 0 && /^\s+$/.test(piece.prevRaw);
    if (prevIsWhitespace && fused.length > 0 && fused[fused.length - 1] === piece.prevRaw) {
      fused.pop();
    }
    // The slot contributes "" regardless; nothing to push.
  }
  return fused.join('');
}

// Coerce a non-null/undefined value to its string concat form. Strings
// pass through; numbers / booleans use JS coercion; arrays (rare —
// happens when a recursive slot returns an array of strings) join with
// '' since the caller already applied the proper separator at the
// array-bearing slot site.
function stringifyForConcat(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => stringifyForConcat(v)).join('');
  return String(value);
}

// Re-derives the synthetic captures key for a structure ref. Kept in sync
// with emit/captures.ts → syntheticKey. We don't import the emit-side
// helper to keep the interpreter independent of code-emission modules.
function syntheticKey(ref: StructureRef): string {
  switch (ref.__ref) {
    case 'span-value':
    case 'span-presence':
      return ref.name;
    case 'span-gap':
      return `__gap_${jsIdent(ref.from)}_${jsIdent(ref.to)}`;
    case 'span-tail':
      return `__tail_${jsIdent(ref.from)}`;
    case 'span-raw':
      return `__raw_${jsIdent(ref.name)}`;
    case 'span-ends-with':
      return `__endsWith_${jsIdent(ref.name)}_${jsIdent(ref.suffix)}`;
    case 'span-comment-left':
      return `__commentLeft_${jsIdent(ref.name)}`;
    case 'span-comment-right':
      return `__commentRight_${jsIdent(ref.name)}`;
  }
}

function jsIdent(name: string): string {
  return name.replace(/[^A-Za-z0-9_$]/g, '_');
}
