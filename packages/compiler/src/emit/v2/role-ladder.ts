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
// Fallthrough role (Task 1.3d): a role whose first span has no fixed first
// byte (until/rawUntil/repeats/optional first span, or recursive into another
// fallthrough role) is treated as the catch-all. The ladder emits byte-
// dispatched branches for the byte-signatured roles, then tries fallthrough
// roles (Task 1.3f: ordered author-declared sentinel speculation when more
// than one).
//
// Same-byte conflict (Task 1.3f): when 2+ byte-signatured roles share a
// first byte (e.g. HTML Doctype `<!`, Comment `<!--`, HtmlElement `<` all
// start with 0x3c), the ladder emits **sentinel speculation** within that
// byte group. Roles in the group are tried in order — longest-literal-prefix
// first, then class-byte roles, then declaration-order ties — using pure
// null-return + state.pos rewind. No throws, no try/catch.
//
// Multi-fallthrough conflict (Task 1.3f): when 2+ roles have fallthrough
// first spans (e.g. CSS `Rule` and `Declaration` both lead with `.until()`),
// the ladder emits sentinel speculation across the fallthrough roles in
// author declaration order. The author's ordering encodes priority — the
// schema must list the more-specific role first.
//
// Switch-based dispatch (Task 4.4): when the byte-dispatch fanout is wide
// (≥ DISPATCH_SWITCH_MIN_BYTES distinct first-bytes across all groups),
// the ladder emits a `switch (__c0)` statement instead of a chain of
// `if (__c0 === N) ... else if (__c0 === M)` blocks. The JIT lowers a
// switch with ≥4 cases on a small integer to a jump table on hot paths,
// avoiding the per-arm branch-prediction overhead of the chained form.
// For narrow fanouts (2-3 arms) the chain is kept since the JIT predicts
// it well and the dispatch is rarely the bottleneck.

import { CompilerError, type NodeTypeInfo, type ResolvedSpan } from '../../model.ts';
import { indent } from '../strings.ts';
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
  // of first-byte sets across all its productions' first spans, plus a
  // `fallthrough` flag set when at least one production has a first span
  // with no fixed first byte (until/rawUntil/repeats/optional/recursive into
  // a fallthrough role) and a `literalPrefix` set listing the literal first-
  // span texts for productions that lead with a literal (used by the same-
  // byte conflict resolver to order longer prefixes first).
  const signatures = roles.map((role, idx) => {
    const info = ctx.nodeTypes.get(role);
    if (!info) {
      throw new CompilerError(
        `v2: multi-role span references unknown role '${role}'`,
      );
    }
    return {
      ...computeRoleFirstBytes(role, info, ctx.nodeTypes),
      role,
      declOrder: idx,
    };
  });

  // Fallthrough roles — tried in author-declaration order via sentinel
  // speculation when multiple. The ordering preserves intent: schemas with
  // overlapping fallthroughs (CSS Rule vs Declaration, Markdown Leaf vs
  // Paragraph) must list the more-specific role first.
  const fallthroughRoles = signatures.filter((s) => s.fallthrough);

  // Group byte-signatured roles (non-fallthrough) by first byte. Roles
  // whose byte-set is disjoint from all others get plain byte dispatch.
  // Roles whose byte-set overlaps another role's get grouped and dispatched
  // via per-group sentinel speculation (longest-literal-prefix first).
  const byteRoles = signatures.filter((s) => !s.fallthrough && s.bytes.size > 0);
  const byteToRoles = new Map<number, typeof byteRoles>();
  for (const sig of byteRoles) {
    for (const byte of sig.bytes) {
      const bucket = byteToRoles.get(byte) ?? [];
      bucket.push(sig);
      byteToRoles.set(byte, bucket);
    }
  }

  // Build byte-dispatch groups. Each group is the set of roles sharing at
  // least one first byte (transitive closure across shared bytes). Singleton
  // groups → direct call; multi-role groups → speculation within group.
  const groups: Array<{ readonly bytes: Set<number>; readonly roles: typeof byteRoles }> = [];
  const visited = new Set<typeof byteRoles[number]>();
  for (const sig of byteRoles) {
    if (visited.has(sig)) continue;
    const group: typeof byteRoles = [];
    const bytes = new Set<number>();
    const queue: typeof byteRoles = [sig];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      group.push(cur);
      for (const b of cur.bytes) {
        bytes.add(b);
        const neighbors = byteToRoles.get(b) ?? [];
        for (const n of neighbors) {
          if (!visited.has(n)) queue.push(n);
        }
      }
    }
    groups.push({ bytes, roles: group });
  }

  // Sort groups so the most-discriminating (largest byte set) goes first.
  // Each role within a same-byte group is ordered by longest-literal-prefix
  // first (so e.g. `<!--` Comment beats `<!` Doctype beats `<` HtmlElement);
  // class-byte roles trail since their byte set is broader and they should
  // be tried last. Ties resolve by declaration order.
  groups.sort((a, b) => b.bytes.size - a.bytes.size);
  for (const group of groups) {
    group.roles.sort((a, b) => {
      const ap = a.longestLiteralPrefix;
      const bp = b.longestLiteralPrefix;
      if (ap !== bp) return bp - ap; // longer prefix first
      // No literal prefix means class-byte role — push to end.
      if (ap === 0 && bp === 0) return a.declOrder - b.declOrder;
      return a.declOrder - b.declOrder;
    });
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

  // Fallthrough handling — tried after all byte-dispatch branches missed.
  // 0 fallthroughs: no else / default clause.
  // 1 fallthrough: unconditional dispatch (current 1.3d behavior).
  // 2+ fallthroughs: sentinel speculation across them in declaration order.
  let fallthroughBody: string | null = null;
  if (fallthroughRoles.length === 1) {
    fallthroughBody = `${resultVar} = ${ctx.symbolPrefix}parse${fallthroughRoles[0]!.role}(state);`;
  } else if (fallthroughRoles.length >= 2) {
    fallthroughBody = emitSpeculationGroup(
      fallthroughRoles.map((r) => r.role),
      resultVar,
      ctx.symbolPrefix,
    );
  }

  // Total distinct first-byte arms across all byte-dispatch groups. When
  // wide enough (≥ DISPATCH_SWITCH_MIN_BYTES) we emit a `switch (__c0)`
  // jump table — JITs lower a small-int switch with ≥4 cases to a direct
  // jump table on hot paths, avoiding the per-arm branch-prediction
  // overhead of the chained `if (__c0 === N) ... else if ...` form. For
  // narrow fanouts the chain is kept since the JIT predicts it well and
  // generates equivalent code.
  let totalBytes = 0;
  for (const group of groups) totalBytes += group.bytes.size;

  if (groups.length > 0 && totalBytes >= DISPATCH_SWITCH_MIN_BYTES) {
    // Switch form: emit one `case N:` per byte in each group, all sharing
    // the same body (a direct call or a speculation chain). Multiple bytes
    // for the same group are emitted as stacked case labels — the JIT
    // compiles all labels to a single jump-table entry.
    //
    //   switch (__c0) {
    //     case 35: case 36:
    //       __r = parseHash(state);
    //       break;
    //     case 64:
    //       __r = parseAt(state);
    //       break;
    //     default:
    //       <fallthrough>
    //       break;
    //   }
    lines.push(`  switch (__c0) {`);
    for (const group of groups) {
      const sortedBytes = [...group.bytes].sort((a, b) => a - b);
      const caseLabels = sortedBytes.map((b) => `case ${b}:`).join(' ');
      const body = group.roles.length === 1
        ? `${resultVar} = ${ctx.symbolPrefix}parse${group.roles[0]!.role}(state);`
        : emitSpeculationGroup(group.roles.map((r) => r.role), resultVar, ctx.symbolPrefix);
      lines.push(`    ${caseLabels}`);
      lines.push(`${indent(body, 3)}`);
      lines.push(`      break;`);
    }
    if (fallthroughBody !== null) {
      lines.push(`    default:`);
      lines.push(`${indent(fallthroughBody, 3)}`);
      lines.push(`      break;`);
    }
    lines.push(`  }`);
  } else {
    // Chained-if form (≤3 arms): emit byte-dispatched branches per group as
    // a chain of `if (<cond>) { <body> } else if ...`. Singleton group →
    // direct call; multi-role group → sentinel speculation across roles.
    const branchTexts: string[] = [];
    for (const group of groups) {
      const cond = [...group.bytes].sort((a, b) => a - b).map((b) => `__c0 === ${b}`).join(' || ');
      const body = group.roles.length === 1
        ? `${resultVar} = ${ctx.symbolPrefix}parse${group.roles[0]!.role}(state);`
        : emitSpeculationGroup(group.roles.map((r) => r.role), resultVar, ctx.symbolPrefix);
      branchTexts.push(`if (${cond}) {\n${indent(body, 2)}\n  }`);
    }

    if (branchTexts.length > 0 && fallthroughBody !== null) {
      // Chain byte-branches with `else if` for compactness, then an unconditional
      // `else { <fallthrough> }`. The fallthrough body is a sentinel chain when
      // multiple fallthrough roles exist.
      lines.push(`  ${branchTexts.join(' else ')} else {\n${indent(fallthroughBody, 2)}\n  }`);
    } else if (branchTexts.length > 0) {
      // Byte branches only — no fallthrough. Plain ladder, chained with `else if`.
      lines.push(`  ${branchTexts.join(' else ')}`);
    } else if (fallthroughBody !== null) {
      // Only fallthrough(s), no byte branches.
      lines.push(`${indent(fallthroughBody, 1)}`);
    }
  }

  lines.push(`}`);
  return lines.join('\n');
}

// Threshold for switch-based dispatch (Task 4.4). When the total number of
// distinct first-byte arms across all byte-dispatch groups reaches this
// value, the ladder emits a `switch (__c0)` jump table instead of a chain
// of `if (__c0 === N) ... else if (__c0 === M)` blocks. JITs (V8/SpiderMonkey)
// lower a small-int switch with ≥4 cases to a direct jump-table on hot paths,
// while chained ifs rely on branch prediction. 4 is the spec'd Task 4.4
// threshold and matches the AC_MIN_STOPS pattern used by .until() scans.
export const DISPATCH_SWITCH_MIN_BYTES = 4;

// Emit a sentinel-speculation chain over `roles`, writing the first non-null
// parse result to `resultVar`. Pure null-return + state.pos rewind — no
// throws (per v2 contract; docs/scannerless-emit-v2.md ladder rung 3).
//
// State protocol: state.pos is the entry position before any attempt. Each
// role's parseFn rewinds state.pos on null-return (per the v2 production
// contract). So between attempts state.pos is already restored — we just
// keep trying the next role. After the chain, `resultVar` is either the
// successful role's value (and state.pos has been advanced by that role)
// or null (state.pos is the entry position).
//
// Generated shape (3 roles):
//   __r = parseA(state);
//   if (__r === null) { __r = parseB(state); }
//   if (__r === null) { __r = parseC(state); }
//   ${resultVar} = __r;
function emitSpeculationGroup(roles: ReadonlyArray<string>, resultVar: string, symbolPrefix: string): string {
  if (roles.length === 0) {
    throw new Error('emitSpeculationGroup: called with no roles');
  }
  if (roles.length === 1) {
    return `${resultVar} = ${symbolPrefix}parse${roles[0]!}(state);`;
  }
  const lines: string[] = [];
  lines.push(`${resultVar} = ${symbolPrefix}parse${roles[0]!}(state);`);
  for (let i = 1; i < roles.length; i++) {
    lines.push(`if (${resultVar} === null) { ${resultVar} = ${symbolPrefix}parse${roles[i]!}(state); }`);
  }
  return lines.join('\n');
}

// Compute the set of valid first bytes for any production of a role, plus a
// `fallthrough` flag set when at least one production's first span has no
// fixed first byte (until/rawUntil/repeats/optional/recursive-into-fallthrough),
// plus a `longestLiteralPrefix` byte-length used by the same-byte conflict
// resolver to order roles longer-prefix-first within a speculation group.
// Fallthrough roles are the catch-all branch in `emitRoleLadder` — multiple
// fallthrough roles are tried via sentinel speculation in declaration order.
type RoleFirstBytes = {
  readonly bytes: ReadonlySet<number>;
  readonly fallthrough: boolean;
  // Length (in bytes) of the longest literal first-span text across this
  // role's productions. 0 for roles whose first span is a class or a
  // recursive role with no literal. Used to order same-byte-conflict
  // speculation groups: longer literals win.
  readonly longestLiteralPrefix: number;
};

export function computeRoleFirstBytes(
  role: string,
  info: NodeTypeInfo,
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
  visiting: Set<string> = new Set(),
): RoleFirstBytes {
  if (visiting.has(role)) {
    // Left-recursive role chain — not statically dispatchable. We mark this
    // as fallthrough so the caller treats it as the catch-all (the only
    // sensible behavior for a self-referential role: the ONLY way to enter
    // it from outside is via a literal/class first span on a different
    // production, which we've already accounted for in the non-recursive
    // path).
    return { bytes: new Set(), fallthrough: true, longestLiteralPrefix: 0 };
  }
  visiting.add(role);

  const bytes = new Set<number>();
  let fallthrough = false;
  let longestLiteralPrefix = 0;
  for (const prod of info.productions) {
    const span0 = prod.spans[0];
    if (!span0) {
      visiting.delete(role);
      throw new CompilerError(
        `v2: multi-role span dispatch: role '${role}' has a production with no spans`,
      );
    }
    // First-span shapes with no fixed first byte mark this role as
    // fallthrough. The ladder dispatches it unconditionally as the catch-all
    // (or via sentinel speculation when 2+ fallthroughs in one role list).
    if (
      findSpanModifier(span0, 'until') ||
      findSpanModifier(span0, 'rawUntil') ||
      findSpanModifier(span0, 'repeats') ||
      hasSpanModifier(span0, 'optional')
    ) {
      fallthrough = true;
      continue;
    }
    // Recursive first span — descend into the referenced role(s). The
    // dispatch byte for the outer role is whatever the inner role accepts;
    // if any inner role is fallthrough, this production propagates that.
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
        if (inner.fallthrough) fallthrough = true;
        if (inner.longestLiteralPrefix > longestLiteralPrefix) {
          longestLiteralPrefix = inner.longestLiteralPrefix;
        }
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
      if (span0.text.length > longestLiteralPrefix) {
        longestLiteralPrefix = span0.text.length;
      }
      continue;
    }
    // Comment class: first two bytes are `/` `*`. Dispatch on `/`. The
    // longest-prefix value is 2 (the `/*` opener) so same-byte conflict
    // resolution treats a comment role as having a 2-byte prefix.
    if (span0.class === 'comment') {
      bytes.add(0x2f);
      if (longestLiteralPrefix < 2) longestLiteralPrefix = 2;
      continue;
    }
    // Class span: derive first-byte set from the class kind. We over-approximate
    // for ident classes (a-z, A-Z, _, plus -/\ depending on refinement). The
    // role-dispatch ladder accepts the union; conflict detection on the caller
    // side flags overlap between roles.
    classFirstBytes(span0).forEach((b) => bytes.add(b));
  }
  visiting.delete(role);
  return { bytes, fallthrough, longestLiteralPrefix };
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
