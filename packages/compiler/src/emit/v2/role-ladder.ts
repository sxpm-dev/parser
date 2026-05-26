// Multi-role dispatch ladder primitive used by `emitSpan` in `./span.ts`.
//
// Shared by:
//   - emitRecursiveSpan (Task 1.3b) — one-shot ladder for non-repeats spans
//   - emitRepeatsSpan   (Task 1.3c) — same ladder inside while(true)
//
// Contract: emits a code block that
//   - assumes the locals `input`, `len`, `off`, `state` are in scope
//   - skips inter-role whitespace before peeking the first byte
//   - peeks `input.charCodeAt(off)` and dispatches to the matching role's
//     parse function (`parse<Role>(state)`) by first-byte
//   - on a successful role parse, sets `<resultVar> = <value>` and `off =
//     state.pos`
//   - on no first-byte match OR a matched role's parse returning null, leaves
//     `<resultVar>` as null and does NOT advance `off` past the original
//     position (the matched role's own failure path already rewound state.pos)
//
// No throws, ever — per v2 design (docs/scannerless-emit-v2.md). The caller
// decides how to treat `<resultVar> === null` (rewind+return null for
// non-optional, no-op for optional, break loop for repeats).
//
// Failure mode for ambiguous role sets: when two roles share their first-byte
// signature, this helper raises CompilerError at codegen time. Proper
// disambiguation needs the peek-scan dispatcher in Task 1.3d; we explicitly
// reject the ambiguity here so the bug surfaces at codegen rather than as a
// silent first-wins runtime behavior.

import { CompilerError, type NodeTypeInfo, type ResolvedSpan } from '../../model.ts';
import { findSpanModifier, hasSpanModifier } from './modifiers.ts';
import type { SpanContext } from './span.ts';

export type RoleLadderOptions = {
  // Name of the JS local that receives the parsed value (or stays null when
  // no role matched). Callers declare this `let` themselves before the ladder
  // so they can scope it to their own block.
  readonly resultVar: string;
};

export function emitRoleLadder(
  roles: ReadonlyArray<string>,
  ctx: SpanContext,
  options: RoleLadderOptions,
): string {
  if (roles.length === 0) {
    throw new Error('emitRoleLadder: called with no roles');
  }

  // Build per-role first-byte signature. Each role's signature is the union
  // of first-byte sets across all its productions' first spans. A role with
  // an indeterminate first byte (until/repeats first span, optional first
  // span, or recursive first span pointing at another multi-role decision)
  // cannot be byte-dispatched — reject as a 1.3d concern.
  const signatures = roles.map((role) => {
    const info = ctx.nodeTypes.get(role);
    if (!info) {
      throw new CompilerError(
        `v2: multi-role span references unknown role '${role}'`,
      );
    }
    return computeRoleFirstBytes(role, info, ctx.nodeTypes);
  });

  // First-byte conflict detection: if any byte appears in two roles'
  // signature, byte-prefix dispatch can't tell them apart. 1.3d will add
  // peek-scan / speculation handling; until then, raise at codegen.
  const seen = new Map<number, string>();
  for (let i = 0; i < roles.length; i++) {
    const sig = signatures[i]!;
    for (const byte of sig.bytes) {
      const prior = seen.get(byte);
      if (prior !== undefined && prior !== roles[i]) {
        throw new CompilerError(
          `v2: multi-role span has roles sharing first byte 0x${byte.toString(16)} ` +
            `('${prior}' and '${roles[i]}'); peek-scan dispatch not yet supported (Task 1.3d)`,
        );
      }
      seen.set(byte, roles[i]!);
    }
  }

  const resultVar = options.resultVar;
  const lines: string[] = [];

  // Inter-role ws skip — same shape as the production-body skipWs block. The
  // ladder owns this so callers don't have to redundantly emit it before
  // each dispatch decision (relevant for the 1.3c repeats loop).
  lines.push(`while (off < len) {`);
  lines.push(`  const __wc = input.charCodeAt(off);`);
  lines.push(`  if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }`);
  lines.push(`  break;`);
  lines.push(`}`);
  lines.push(`state.pos = off;`);
  lines.push(`if (off < len) {`);
  lines.push(`  const __c0 = input.charCodeAt(off);`);

  // Emit one if-branch per role, ordered by descending signature byte-set
  // size — keeps the most-discriminating branch closest to the top.
  const ordered = roles
    .map((role, i) => ({ role, sig: signatures[i]! }))
    .sort((a, b) => b.sig.bytes.size - a.sig.bytes.size);

  for (const { role, sig } of ordered) {
    if (sig.bytes.size === 0) continue;
    const cond = [...sig.bytes].sort((a, b) => a - b).map((b) => `__c0 === ${b}`).join(' || ');
    lines.push(`  if (${cond}) {`);
    lines.push(`    ${resultVar} = parse${role}(state);`);
    // On null-return, leave resultVar = null and state.pos rewound — caller
    // decides what to do (non-optional rewinds parent's entry; optional
    // treats as "absent"; repeats breaks the loop).
    lines.push(`  }`);
  }

  lines.push(`}`);
  return lines.join('\n');
}

// Compute the set of valid first bytes for any production of a role. Returns
// `bytes` empty when the role's first-byte set can't be determined statically
// (e.g. first span is until / repeats / optional / recursive). Multi-byte
// signatures (peek-ahead) are out of scope here — they belong to Task 1.3d.
type RoleFirstBytes = {
  readonly bytes: ReadonlySet<number>;
};

export function computeRoleFirstBytes(
  role: string,
  info: NodeTypeInfo,
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
  visiting: Set<string> = new Set(),
): RoleFirstBytes {
  if (visiting.has(role)) {
    // Left-recursive role chain — not statically dispatchable. Returning an
    // empty set causes the caller's downstream conflict / dispatch-failure
    // check to fire.
    return { bytes: new Set() };
  }
  visiting.add(role);

  const bytes = new Set<number>();
  for (const prod of info.productions) {
    const span0 = prod.spans[0];
    if (!span0) {
      visiting.delete(role);
      throw new CompilerError(
        `v2: multi-role span dispatch: role '${role}' has a production with no spans`,
      );
    }
    // Disqualifying first-span modifiers (the production's first token is not
    // a single peek-able byte).
    if (
      findSpanModifier(span0, 'until') ||
      findSpanModifier(span0, 'rawUntil') ||
      findSpanModifier(span0, 'repeats') ||
      hasSpanModifier(span0, 'optional')
    ) {
      visiting.delete(role);
      throw new CompilerError(
        `v2: multi-role span dispatch: role '${role}' has a production whose first span ` +
          `is until/rawUntil/repeats/optional — byte-prefix dispatch not yet supported (Task 1.3d)`,
      );
    }
    // Recursive first span — descend into the referenced role(s). The
    // dispatch byte for the outer role is whatever the inner role accepts.
    if (span0.recursiveRoles.length > 0) {
      for (const innerRole of span0.recursiveRoles) {
        const innerInfo = nodeTypes.get(innerRole);
        if (!innerInfo) {
          visiting.delete(role);
          throw new CompilerError(
            `v2: multi-role span dispatch: role '${role}' references unknown inner role '${innerRole}'`,
          );
        }
        const inner = computeRoleFirstBytes(innerRole, innerInfo, nodeTypes, visiting);
        for (const b of inner.bytes) bytes.add(b);
      }
      continue;
    }
    // Literal first span: first byte is the literal's first character.
    if (span0.class === 'literal') {
      if (!span0.text || span0.text.length === 0) {
        visiting.delete(role);
        throw new CompilerError(
          `v2: multi-role span dispatch: role '${role}' has a literal first span with empty text`,
        );
      }
      bytes.add(span0.text.charCodeAt(0));
      continue;
    }
    // Comment class: first two bytes are `/` `*`. Dispatch on `/`.
    if (span0.class === 'comment') {
      bytes.add(0x2f);
      continue;
    }
    // Class span: derive first-byte set from the class kind. We over-approximate
    // for ident classes (a-z, A-Z, _, plus -/\ depending on refinement). The
    // role-dispatch ladder accepts the union; conflict detection on the caller
    // side flags overlap between roles.
    classFirstBytes(span0).forEach((b) => bytes.add(b));
  }
  visiting.delete(role);
  return { bytes };
}

export function classFirstBytes(span: ResolvedSpan): ReadonlySet<number> {
  const refSet = new Set(span.refinements.map((r) => r.name));
  const out = new Set<number>();
  const cls = span.class;
  const addRange = (from: number, to: number) => {
    for (let c = from; c <= to; c++) out.add(c);
  };
  if (cls === 'ident') {
    addRange(0x41, 0x5a); // A-Z
    addRange(0x61, 0x7a); // a-z
    out.add(0x5f); // _
    if (refSet.has('js')) {
      out.add(0x24); // $
    } else {
      // css/html/default
      out.add(0x2d); // -
      if (!refSet.has('css') && !refSet.has('html')) out.add(0x5c); // \\ escape
    }
    return out;
  }
  if (cls === 'number') {
    addRange(0x30, 0x39); // 0-9
    return out;
  }
  if (cls === 'hex') {
    addRange(0x30, 0x39);
    addRange(0x41, 0x46);
    addRange(0x61, 0x66);
    return out;
  }
  if (cls === 'string') {
    out.add(0x22); // "
    out.add(0x27); // '
    return out;
  }
  // Other classes (regex/template/whitespace/keyword/operator) aren't used as
  // a role's first span in any current schema — surface as codegen error so
  // we notice if a new schema needs it.
  throw new CompilerError(
    `v2: multi-role span dispatch: class '${cls}' not yet supported as a role first-token`,
  );
}

