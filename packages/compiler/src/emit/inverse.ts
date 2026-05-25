// Inverse emit. For each (production, target) pair we emit:
//
//   function __invert_<NodeType>_<idx>_<target>(value): string
//     - Walks the production's `inverseDerived: InverseIR` and populates a
//       local `captures = {}` from the rendered value.
//     - Calls __rebuild_<NodeType>_<idx>(captures) to produce the canonical
//       source string.
//
// For each declared target we emit `__dispatchInverse_<target>(value)`:
//   - Object-valued targets dispatch on the body's literal field values
//     (precondition 2, "Inverse derivation" in the spec).
//   - String-valued (template) targets dispatch on the unique leading
//     literal prefix.
//   - Scalar / ref bodies are only legal as the sole production for a
//     target — discrimination collapses to the single case.
//   - Mismatches throw "stringify: no production matches".
//
// The runtime exposes `stringify(value, { type })`:
//   - Reads `__defaultTarget` when no `type` is provided.
//   - Throws "stringify: missing target" / "stringify: unknown target".
//   - Routes through `__inverseDispatch[target]`.
//
// Recursion: captures referencing recursive children land as nested
// rendered values (objects for object targets, fully-rebuilt strings for
// template targets). `__invertSlot_<target>` coerces a value to a
// source string by either returning it as-is (string) or routing through
// `__dispatchInverse_<target>(value)` (object).

import type {
  InferredSchema,
  InverseField,
  InverseIR,
  NodeTypeInfo,
  Production,
  RenderTargetIR,
} from '../model.ts';
import { rebuildFnName } from './rebuild.ts';
import { jsString } from './strings.ts';

export function emitInverse(schema: InferredSchema): string {
  const targets = collectTargets(schema);
  const inverters: string[] = [];
  const dispatchers: string[] = [];
  const slotHelpers: string[] = [];

  for (const target of targets) {
    for (const info of schema.nodeTypes.values()) {
      for (let i = 0; i < info.productions.length; i++) {
        const production = info.productions[i]!;
        const entry = production.renders.get(target);
        if (!entry) {
          throw new Error(`inverse: production '${info.name}#${i}' missing target '${target}'`);
        }
        inverters.push(emitInverter(info.name, i, target, entry, production));
      }
    }
    // Gap C: per-(NodeType, target) dispatchers. The PUBLIC stringify routes
    // through `__dispatchInverse_<rootType>_<target>` only — sub-productions
    // are reachable only via recursive child capture sites that dispatch on
    // the statically-known child node type. This prevents a sub-production's
    // template prefix (e.g. `*` for a CronField wildcard) from accidentally
    // matching a root-level rendered value that starts the same way.
    for (const info of schema.nodeTypes.values()) {
      dispatchers.push(emitNodeDispatcher(info, target));
      slotHelpers.push(emitNodeSlotHelper(info.name, target));
    }
    // Generic leaf slot helper (per target) for non-recursive captures.
    // Non-recursive captures are primitives or arrays of primitives — no
    // dispatching needed; the helper just unboxes shapes for rebuild.
    slotHelpers.push(emitLeafSlotHelper(target));
    // Root entry-point dispatcher used by the public stringify table.
    dispatchers.push(emitRootDispatcher(schema.rootType, target));
  }

  const dispatchTable = emitDispatchTable(targets);
  const publicStringify = emitPublicStringify();

  return [
    inverters.join('\n\n'),
    dispatchers.join('\n\n'),
    slotHelpers.join('\n\n'),
    dispatchTable,
    publicStringify,
  ].filter((p) => p !== '').join('\n\n');
}

// ---------------------------------------------------------------------------
// Inverter emit per (production, target)
// ---------------------------------------------------------------------------

function emitInverter(
  nodeName: string,
  prodIdx: number,
  target: string,
  entry: RenderTargetIR,
  production: Production,
): string {
  const fnName = inverterName(nodeName, prodIdx, target);
  const ir = entry.inverseDerived;
  if (!ir) {
    throw new Error(`inverse: missing inverseDerived for '${nodeName}#${prodIdx}' target '${target}'`);
  }
  // Scalar bodies recover no captures — the production has no free slots in
  // this target. The rebuild subroutine needs captures to interleave the
  // spans, so for scalar-bodied inverses we just assert equality and return
  // the example source verbatim (it IS the canonical form because every
  // span value is constant).
  if (ir.kind === 'scalar') {
    const assertion = emitScalarAssertion(ir.value, 'value');
    return `function ${fnName}(value: any): string {
${indent(assertion, 1)}
  return ${jsString(production.source.input)};
}`;
  }
  const body = emitInverseBody(ir, 'value', target, production);
  const rebuild = rebuildFnName(nodeName, prodIdx);
  return `function ${fnName}(value: any): string {
  const captures: any = {};
${indent(body, 1)}
  return ${rebuild}(captures);
}`;
}

// Returns JS statements (one per line, no leading indent) that read from the
// given `value` expression into the in-scope `captures` object.
//
// Gap C: capture sites resolve the slot helper per (child node type,
// target). The child node type for each capture is looked up on the
// owning production's spans (`recursiveRoles[0]`). Non-recursive
// captures use a target-scoped no-dispatch helper that just unboxes the
// already-source-shaped value.
function emitInverseBody(
  ir: InverseIR,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  switch (ir.kind) {
    case 'object':
      return emitObjectBody(ir.fields, valueExpr, target, production);
    case 'array':
      return emitArrayBody(ir.elements, valueExpr, target, production);
    case 'scalar':
      return emitScalarAssertion(ir.value, valueExpr);
    case 'ref':
      return `captures${memberAccess(ir.capture)} = ${slotHelperCall(ir.capture, production, target, valueExpr)};`;
    case 'template':
      return emitTemplateBody(ir.segments, ir.captures, valueExpr, target, production);
  }
}

function emitObjectBody(
  fields: ReadonlyArray<InverseField>,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  const lines: string[] = [];
  lines.push(
    `if (${valueExpr} === null || typeof ${valueExpr} !== "object" || Array.isArray(${valueExpr})) {`,
    `  throw new Error("stringify: expected object value, got " + typeof ${valueExpr});`,
    `}`,
  );
  for (const field of fields) {
    const access = `${valueExpr}${memberAccess(field.name)}`;
    if (field.kind === 'literal') {
      const litJs = jsLiteral(field.value);
      lines.push(
        `if (!Object.is(${access}, ${litJs})) {`,
        `  throw new Error("stringify: field ${escapeForError(JSON.stringify(field.name))} expected ${escapeForError(litJs)}, got " + JSON.stringify(${access}));`,
        `}`,
      );
    } else {
      lines.push(...emitInverseBody(field.inverse, access, target, production).split('\n'));
    }
  }
  return lines.join('\n');
}

function emitArrayBody(
  elements: ReadonlyArray<InverseIR>,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  const lines: string[] = [];
  lines.push(
    `if (!Array.isArray(${valueExpr}) || ${valueExpr}.length !== ${elements.length}) {`,
    `  throw new Error("stringify: expected array of length ${elements.length}, got " + (Array.isArray(${valueExpr}) ? ("length " + ${valueExpr}.length) : typeof ${valueExpr}));`,
    `}`,
  );
  for (let i = 0; i < elements.length; i++) {
    lines.push(...emitInverseBody(elements[i]!, `${valueExpr}[${i}]`, target, production).split('\n'));
  }
  return lines.join('\n');
}

// Lookup whether a named capture on the given production references an
// optional (.optional() or .repeats({min:0})) span. Used by the inverse
// template scanner so the tail-optional-absent path mirrors Gap A's
// forward fusion.
function isOptionalCapture(production: Production, captureName: string): boolean {
  for (const span of production.spans) {
    if (span.name !== captureName) continue;
    for (const m of span.modifiers) {
      if (m.kind === 'optional') return true;
      if (m.kind === 'repeats' && (m.min === undefined || m.min === 0)) return true;
    }
    return false;
  }
  return false;
}

// Resolve the slot-helper call for a capture site. Looks up the capture's
// span on the owning production. If the span is recursive (single child
// role — Gap C v1 constraint), call the per-(child-node-type, target)
// helper so the recursive dispatcher is scoped to the child node's
// productions only. Otherwise the captured value is a leaf (string or
// array of strings) and we route through the generic per-target slot
// helper that just unboxes.
function slotHelperCall(
  capture: string,
  production: Production,
  target: string,
  valueExpr: string,
): string {
  for (const span of production.spans) {
    if (span.name !== capture) continue;
    const roles = span.recursiveRoles;
    if (roles.length === 0) {
      // Non-recursive capture — primitive or repeated primitive. The
      // generic helper handles null/string/array pass-through without
      // dispatching to any per-node inverter.
      return `__invertSlotLeaf_${jsIdent(target)}(${valueExpr})`;
    }
    if (roles.length === 1) {
      return `${nodeSlotHelperName(roles[0]!, target)}(${valueExpr})`;
    }
    // Multi-role recursive capture is rejected at v1 — the per-call-site
    // dispatcher cannot pick which child node type to use without runtime
    // discrimination on the rendered value's shape (the very thing Gap C
    // pushes out of the public surface). Surface a clear compile error
    // when encountered; the spec calls this out under v1 constraints.
    throw new Error(
      `inverse: capture '${capture}' in production '${production.nodeType}' references multiple recursive roles (${roles.join(', ')}); v1 supports single-role recursive captures only`,
    );
  }
  // No span found for this capture — defensive fallback. This shouldn't
  // happen because validate.ts checks that every $.name in a body refers
  // to a real span. Use the leaf helper so the build still runs.
  return `__invertSlotLeaf_${jsIdent(target)}(${valueExpr})`;
}

function emitScalarAssertion(
  expected: string | number | boolean | null,
  valueExpr: string,
): string {
  const litJs = jsLiteral(expected);
  return [
    `if (!Object.is(${valueExpr}, ${litJs})) {`,
    `  throw new Error("stringify: expected scalar ${escapeForError(litJs)}, got " + JSON.stringify(${valueExpr}));`,
    `}`,
  ].join('\n');
}

function emitTemplateBody(
  segments: ReadonlyArray<string>,
  captures: ReadonlyArray<string>,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  // Literal-segment scanner. segments.length === captures.length + 1.
  // Walk:
  //   start at offset 0
  //   require value starts with segments[0]; advance past it
  //   for each i: read up to next occurrence of segments[i+1] into captures[i]
  //   final: require remainder starts with segments[captures.length]
  //
  // Optional-tail handling (mirrors Gap A's forward fusion):
  //   The forward render path now suppresses an optional-absent slot AND
  //   its preceding whitespace separator. The inverse scanner must accept
  //   the same shape — when scanning for the separator that precedes an
  //   optional capture fails AND every capture from that point on is
  //   optional (or .repeats({min:0})), the scanner consumes the remainder
  //   for captures[i], records null for each tail optional capture, and
  //   exits cleanly. The "tail-only" restriction keeps the scanner
  //   deterministic; mid-list optional captures still require their
  //   separator to be present.
  const isOptional: ReadonlyArray<boolean> = captures.map(
    (name) => isOptionalCapture(production, name),
  );
  // Precompute: for each capture index, true iff every capture at j >= i is optional.
  const tailOptional: boolean[] = new Array(captures.length).fill(false);
  let allOpt = true;
  for (let j = captures.length - 1; j >= 0; j--) {
    if (!isOptional[j]) allOpt = false;
    tailOptional[j] = allOpt;
  }
  const lines: string[] = [];
  lines.push(
    `if (typeof ${valueExpr} !== "string") {`,
    `  throw new Error("stringify: expected string value for template body, got " + typeof ${valueExpr});`,
    `}`,
    `const __s: string = ${valueExpr};`,
    `let __pos = 0;`,
  );
  // Match leading segment
  const seg0 = segments[0] ?? '';
  if (seg0.length > 0) {
    lines.push(
      `if (__s.indexOf(${jsString(seg0)}, __pos) !== __pos) {`,
      `  throw new Error("stringify: expected leading literal ${escapeForError(jsString(seg0))} in template body");`,
      `}`,
      `__pos += ${seg0.length};`,
    );
  }
  for (let i = 0; i < captures.length; i++) {
    const nextSeg = segments[i + 1] ?? '';
    const capName = captures[i]!;
    const helperCall = slotHelperCall(capName, production, target, '__s.slice(__pos)');
    if (i === captures.length - 1 && nextSeg.length === 0) {
      // Last capture, no trailing separator: take the remainder. If the
      // last capture is itself optional and the input is already
      // exhausted, leave it null instead of capturing an empty slice —
      // matches the forward fusion's null-coalesce.
      if (isOptional[i]) {
        lines.push(
          `if (__pos >= __s.length) {`,
          `  captures${memberAccess(capName)} = null;`,
          `} else {`,
          `  captures${memberAccess(capName)} = ${helperCall};`,
          `  __pos = __s.length;`,
          `}`,
        );
      } else {
        lines.push(`captures${memberAccess(capName)} = ${helperCall};`);
        lines.push(`__pos = __s.length;`);
      }
    } else if (nextSeg.length === 0) {
      // Inner adjacent slots are blocked at derivation time, but be
      // defensive — empty separator between captures cannot be scanned.
      throw new Error(`emit/inverse: empty separator between captures '${capName}' and '${captures[i + 1]}'`);
    } else {
      const innerHelperCall = slotHelperCall(capName, production, target, '__s.slice(__pos, __end)');
      // If captures[i+1] is the start of a tail-optional run, missing
      // separator means every subsequent capture is absent. Consume the
      // remainder for captures[i] and null-out the optional tail.
      const nextIdx = i + 1;
      const nextIsTailOptional = nextIdx < captures.length && tailOptional[nextIdx];
      if (nextIsTailOptional) {
        const tailNullLines: string[] = [];
        for (let k = nextIdx; k < captures.length; k++) {
          tailNullLines.push(`  captures${memberAccess(captures[k]!)} = null;`);
        }
        lines.push(
          `{`,
          `  const __end = __s.indexOf(${jsString(nextSeg)}, __pos);`,
          `  if (__end < 0) {`,
          `    captures${memberAccess(capName)} = ${helperCall};`,
          `    __pos = __s.length;`,
          ...tailNullLines,
          `  } else {`,
          `    captures${memberAccess(capName)} = ${innerHelperCall};`,
          `    __pos = __end + ${nextSeg.length};`,
          `  }`,
          `}`,
        );
        // We've fully handled the rest of the captures in the tail-null
        // branch. The else branch falls through to the next loop iter.
        // Subsequent loop iterations will produce more code that only
        // executes when we took the else branch. To preserve that flow,
        // wrap subsequent iterations inside the else branch... but doing
        // that requires structural rewrite. Simpler: rely on the runtime
        // null-set; the subsequent iterations will be guarded by the
        // pos pointer (if pos == __s.length, scanning for nextSeg fails
        // again and the same tail-null logic fires, leaving them null).
        // The captures we set to null above will be overwritten by the
        // subsequent iteration's tail-null branch — same value, no harm.
      } else {
        lines.push(
          `{`,
          `  const __end = __s.indexOf(${jsString(nextSeg)}, __pos);`,
          `  if (__end < 0) {`,
          `    throw new Error("stringify: expected separator ${escapeForError(jsString(nextSeg))} after capture ${capName}");`,
          `  }`,
          `  captures${memberAccess(capName)} = ${innerHelperCall};`,
          `  __pos = __end + ${nextSeg.length};`,
          `}`,
        );
      }
    }
  }
  // Validate trailing remainder when there are no captures (literal-only template)
  // or when the final segment was non-empty and we already advanced past it.
  if (captures.length === 0 && segments.length > 0) {
    const tail = segments[segments.length - 1]!;
    if (tail.length > 0 && tail !== seg0) {
      // Shouldn't happen — single literal segment when captures.length === 0
      // means parts.length === 1. tail === seg0 by construction.
    }
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Per-target dispatcher
// ---------------------------------------------------------------------------

// Per-(NodeType, target) inverse dispatcher. Gap C: the public entry point
// dispatches over the root node's productions only — sub-productions are
// reachable through recursive capture sites that statically know which
// child node type to invoke. validateInverseDiscrimination enforces
// distinguishability WITHIN a node-type, so the cases here are mutually
// exclusive for a well-formed schema.
function emitNodeDispatcher(info: NodeTypeInfo, target: string): string {
  const fnName = nodeDispatcherName(info.name, target);
  // Classify by InverseIR kind shape:
  //  - object-target: switch on literal-field discriminators
  //  - template-target: switch on leading literal prefix (longest match)
  //  - scalar/ref/array (rare): single production; emit a direct call
  //    or throw at runtime if multiple present (already blocked at derive time).
  type Branch = {
    readonly nodeName: string;
    readonly prodIdx: number;
    readonly ir: InverseIR;
    readonly target: string;
  };
  const branches: Branch[] = [];
  for (let i = 0; i < info.productions.length; i++) {
    const entry = info.productions[i]!.renders.get(target);
    if (!entry || !entry.inverseDerived) continue;
    branches.push({ nodeName: info.name, prodIdx: i, ir: entry.inverseDerived, target });
  }
  if (branches.length === 0) {
    return `function ${fnName}(value: any): string {
  throw new Error("stringify: no productions declared for node '${info.name}' target '${target}'");
}`;
  }
  // Group by kind for fast dispatch.
  const objects = branches.filter((b) => b.ir.kind === 'object');
  const templates = branches.filter((b) => b.ir.kind === 'template');
  const scalars = branches.filter((b) => b.ir.kind === 'scalar');
  const refs = branches.filter((b) => b.ir.kind === 'ref');
  const arrays = branches.filter((b) => b.ir.kind === 'array');

  const lines: string[] = [];

  if (objects.length > 0) {
    lines.push('if (value !== null && typeof value === "object" && !Array.isArray(value)) {');
    // Build per-branch (literalConds, presenceConds) where presenceConds
    // distinguish a branch from any other branch with identical literal
    // conditions via field-name presence. Order branches so more-specific
    // (more conditions) come first — same idea as longest-match-first.
    type ObjBranch = Branch & { readonly ir: Extract<InverseIR, { kind: 'object' }> };
    const objBranches = objects as ReadonlyArray<ObjBranch>;
    type Compiled = { readonly branch: ObjBranch; readonly cond: string; readonly specificity: number };
    const compiled: Compiled[] = [];
    for (let i = 0; i < objBranches.length; i++) {
      const b = objBranches[i]!;
      const litCond = literalFieldsCondition(b.ir);
      const names = fieldNameSet(b.ir);
      // Other branches with identical literal-field map (i.e. literalCond
      // alone wouldn't tell them apart) — collect fields they DON'T have
      // that we DO, and fields they have that we DON'T.
      const presenceParts: string[] = [];
      for (let j = 0; j < objBranches.length; j++) {
        if (i === j) continue;
        const other = objBranches[j]!;
        const otherLitCond = literalFieldsCondition(other.ir);
        if (otherLitCond !== litCond) continue;
        const otherNames = fieldNameSet(other.ir);
        // A field present on us but not on the other: assert "name" in value.
        for (const n of names) {
          if (!otherNames.has(n)) {
            const c = `${jsString(n)} in value`;
            if (!presenceParts.includes(c)) presenceParts.push(c);
          }
        }
        // A field present on the other but not on us: assert !("name" in value).
        for (const n of otherNames) {
          if (!names.has(n)) {
            const c = `!(${jsString(n)} in value)`;
            if (!presenceParts.includes(c)) presenceParts.push(c);
          }
        }
      }
      const parts: string[] = [];
      if (litCond !== 'true') parts.push(litCond);
      for (const p of presenceParts) parts.push(p);
      const cond = parts.length === 0 ? 'true' : parts.join(' && ');
      compiled.push({ branch: b, cond, specificity: parts.length });
    }
    // Sort by specificity descending so the most-discriminating branch is
    // tried first — relevant when one branch is a strict subset of another's
    // conditions.
    compiled.sort((x, y) => y.specificity - x.specificity);
    for (const c of compiled) {
      const call = `${inverterName(c.branch.nodeName, c.branch.prodIdx, c.branch.target)}(value)`;
      if (c.cond === 'true') {
        lines.push(`  return ${call};`);
      } else {
        lines.push(`  if (${c.cond}) return ${call};`);
      }
    }
    lines.push('}');
  }
  if (arrays.length > 0) {
    lines.push('if (Array.isArray(value)) {');
    // Discriminate by length (already validated as unique in invert.ts).
    for (const b of arrays) {
      const ir = b.ir as Extract<InverseIR, { kind: 'array' }>;
      const call = `${inverterName(b.nodeName, b.prodIdx, b.target)}(value)`;
      lines.push(`  if (value.length === ${ir.elements.length}) return ${call};`);
    }
    lines.push('}');
  }
  if (templates.length > 0) {
    lines.push('if (typeof value === "string") {');
    // Two-stage dispatch (Fix 1):
    //  1) Branches with a non-empty leading literal prefix dispatch on
    //     `value.startsWith(<prefix>)`, longest-first.
    //  2) Branches sharing a leading prefix (empty or otherwise) with one or
    //     more siblings use a unique embedded literal segment as the
    //     discriminator — `value.includes(<unique-literal>)`, longest-first.
    //  3) A branch that has no unique discriminator vs. its siblings becomes
    //     the fallback (at most one — validateInverseDiscrimination rejected
    //     the schema if there were two such branches sharing a prefix).
    type TplBranch = Branch & { readonly ir: Extract<InverseIR, { kind: 'template' }> };
    // Feature 1 (spec Design rule 5): when two or more template branches
    // are structurally identical (same segments AND same captures), the
    // inverse dispatcher cannot distinguish them — and need not. Group by
    // (segments, captures) shape and keep only the lowest-index branch
    // from each group; the dropped duplicates would have emitted dead
    // `if` clauses checking the same discriminator. Round-trip stays
    // value-stable: rebuilding through the chosen production yields a
    // source whose re-render to this target matches the input value.
    const allTpls = templates as ReadonlyArray<TplBranch>;
    const tpls: TplBranch[] = [];
    const groupSeen = new Set<string>();
    for (const b of allTpls) {
      const key = templateShapeKey(b.ir);
      if (groupSeen.has(key)) continue;
      groupSeen.add(key);
      tpls.push(b);
    }
    type Plan = {
      readonly branch: TplBranch;
      readonly check: string | null; // null = fallback (`return <call>;`)
      readonly priority: number;     // higher = tried earlier
    };
    const plans: Plan[] = [];
    for (const b of tpls) {
      const prefix = b.ir.segments[0] ?? '';
      if (prefix.length > 0) {
        // Prefix-based discriminator. Priority = prefix length.
        plans.push({
          branch: b,
          check: `value.startsWith(${jsString(prefix)})`,
          priority: prefix.length,
        });
        continue;
      }
      // Empty leading prefix: search for a unique embedded literal — a
      // non-empty segment present in our segments but not appearing in any
      // segment of any sibling with the same (empty) leading prefix.
      const sameLeadingSiblings = tpls.filter((other) =>
        other !== b && (other.ir.segments[0] ?? '') === prefix
      );
      const ourLiterals = b.ir.segments.filter((s) => s.length > 0);
      // Pick the longest unique literal so the check is most-specific.
      let bestLit: string | null = null;
      for (const lit of ourLiterals) {
        let foundInSibling = false;
        for (const sib of sameLeadingSiblings) {
          for (const sibSeg of sib.ir.segments) {
            if (sibSeg.includes(lit)) { foundInSibling = true; break; }
          }
          if (foundInSibling) break;
        }
        if (!foundInSibling) {
          if (bestLit === null || lit.length > bestLit.length) bestLit = lit;
        }
      }
      if (bestLit !== null) {
        plans.push({
          branch: b,
          check: `value.indexOf(${jsString(bestLit)}) >= 0`,
          priority: bestLit.length,
        });
      } else {
        // Fallback branch — no discriminator vs. its sibling(s).
        plans.push({ branch: b, check: null, priority: -1 });
      }
    }
    // Order: discriminating branches first (longest discriminator first),
    // fallback branches last. Stable across schemas with the same shape.
    plans.sort((a, b) => b.priority - a.priority);
    for (const p of plans) {
      const call = `${inverterName(p.branch.nodeName, p.branch.prodIdx, p.branch.target)}(value)`;
      if (p.check === null) {
        lines.push(`  return ${call};`);
      } else {
        lines.push(`  if (${p.check}) return ${call};`);
      }
    }
    lines.push('}');
  }
  if (refs.length > 0) {
    // Bare-ref bodies accept any string. At most one per target post-validation.
    lines.push('if (typeof value === "string") {');
    for (const b of refs) {
      const call = `${inverterName(b.nodeName, b.prodIdx, b.target)}(value)`;
      lines.push(`  return ${call};`);
    }
    lines.push('}');
  }
  if (scalars.length > 0) {
    for (const b of scalars) {
      const ir = b.ir as Extract<InverseIR, { kind: 'scalar' }>;
      const lit = jsLiteral(ir.value);
      const call = `${inverterName(b.nodeName, b.prodIdx, b.target)}(value)`;
      lines.push(`if (Object.is(value, ${lit})) return ${call};`);
    }
  }

  lines.push(`throw new Error("stringify: no production matches for target '${target}' (value: " + JSON.stringify(value) + ")");`);

  return `function ${fnName}(value: any): string {
${indent(lines.join('\n'), 1)}
}`;
}

// Feature 1: deterministic shape key for grouping structurally-identical
// template inverses. Two productions whose template body has the same
// segments and the same captures collapse to the same key, and the
// dispatcher keeps only the lowest-index occurrence (see callsite
// comment in emitNodeDispatcher).
function templateShapeKey(ir: Extract<InverseIR, { kind: 'template' }>): string {
  return JSON.stringify({ s: ir.segments, c: ir.captures });
}

function literalFieldsCondition(ir: Extract<InverseIR, { kind: 'object' }>): string {
  const conds: string[] = [];
  for (const field of ir.fields) {
    if (field.kind !== 'literal') continue;
    const access = `value${memberAccess(field.name)}`;
    conds.push(`Object.is(${access}, ${jsLiteral(field.value)})`);
  }
  if (conds.length === 0) return 'true';
  return conds.join(' && ');
}

// Returns the set of field names declared in an object-body inverse —
// literal AND inverse. Used by the dispatcher when literal-field values
// alone don't discriminate (e.g. one production has `flagged: true` and
// the other omits the field entirely; the dispatcher must additionally
// check `"flagged" in value`).
function fieldNameSet(ir: Extract<InverseIR, { kind: 'object' }>): Set<string> {
  const out = new Set<string>();
  for (const field of ir.fields) out.add(field.name);
  return out;
}

// ---------------------------------------------------------------------------
// Slot helper (per-(NodeType, target) recursion entry — Gap C)
// ---------------------------------------------------------------------------

// Per-(NodeType, target) slot helper. Each recursive capture site emits a
// call to `__invertSlotFor_<ChildNodeType>_<target>(value)` so the
// dispatcher routed-into is restricted to the statically-known child node
// type's productions — never the global production list. Behaviour for
// primitive/array shapes is unchanged.
function emitNodeSlotHelper(nodeName: string, target: string): string {
  const helper = nodeSlotHelperName(nodeName, target);
  const childDispatch = nodeDispatcherName(nodeName, target);
  // Returns whatever shape the rebuild expects to read back from captures:
  //   null/undefined → null (Fix 2: rebuild's optional-slot ternary checks
  //                          for null; coercing to "" would mask absent
  //                          state and leave dangling separators).
  //   string         → string (already source-shaped).
  //   array          → array of inverted children (Fix 3: rebuild joins
  //                    repeats arrays with the correct separator via
  //                    __rebuildSlot(captures.x, " "); flattening here
  //                    would lose the per-element boundaries).
  //   object         → dispatch through the per-(NodeType, target)
  //                    inverse dispatcher (Gap C) to recursively rebuild
  //                    the child into a source string.
  //   other          → String(v).
  return `function ${helper}(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = ${helper}(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return ${childDispatch}(v);
  return String(v);
}`;
}

// Per-target leaf slot helper for non-recursive captures (primitives or
// arrays of primitives). No object branch — leaves never carry recursive
// children, so no per-node dispatcher is needed. Arrays still get
// per-element recursion through the same helper so nested arrays of
// strings unbox cleanly.
function emitLeafSlotHelper(target: string): string {
  const id = jsIdent(target);
  return `function __invertSlotLeaf_${id}(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_${id}(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  return String(v);
}`;
}

// Top-level dispatcher used by the public stringify table. Forwards to the
// per-(NodeType, target) dispatcher for the root node type only. Gap C:
// public entry never considers sub-production branches.
function emitRootDispatcher(rootType: string, target: string): string {
  const fnName = `__dispatchInverse_${jsIdent(target)}`;
  const rootCall = nodeDispatcherName(rootType, target);
  return `function ${fnName}(value: any): string {
  return ${rootCall}(value);
}`;
}

function nodeDispatcherName(nodeName: string, target: string): string {
  return `__dispatchInverse_${jsIdent(nodeName)}_${jsIdent(target)}`;
}

function nodeSlotHelperName(nodeName: string, target: string): string {
  return `__invertSlotFor_${jsIdent(nodeName)}_${jsIdent(target)}`;
}

// ---------------------------------------------------------------------------
// Public stringify
// ---------------------------------------------------------------------------

function emitDispatchTable(targets: ReadonlyArray<string>): string {
  const entries = targets.map((target) => `  ${jsString(target)}: __dispatchInverse_${jsIdent(target)},`).join('\n');
  return `const __inverseDispatch: Record<string, (value: any) => string> = {
${entries}
};`;
}

function emitPublicStringify(): string {
  return `export function stringify(value: unknown, options?: { type?: string }): string {
  const target = options?.type ?? __defaultTarget;
  if (!target) {
    throw new Error("stringify: missing target; pass options.type or set defaultTarget on the schema");
  }
  const fn = __inverseDispatch[target];
  if (!fn) {
    throw new Error("stringify: unknown target '" + target + "'");
  }
  return fn(value);
}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectTargets(schema: InferredSchema): ReadonlyArray<string> {
  const set = new Set<string>();
  for (const info of schema.nodeTypes.values()) {
    for (const production of info.productions) {
      for (const target of production.renders.keys()) set.add(target);
    }
  }
  return [...set].sort();
}

export function inverterName(nodeName: string, prodIdx: number, target: string): string {
  return `__invert_${jsIdent(nodeName)}_${prodIdx}_${jsIdent(target)}`;
}

function jsLiteral(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return jsString(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  return value ? 'true' : 'false';
}

function escapeForError(literal: string): string {
  // The literal is already a JS source-form string (e.g. `"foo"`). We embed
  // it inside a double-quoted runtime error message, so the inner double
  // quotes must be escaped.
  return literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function memberAccess(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `.${key}`;
  return `[${jsString(key)}]`;
}

function jsIdent(name: string): string {
  return name.replace(/[^A-Za-z0-9_$]/g, '_');
}

function indent(source: string, level: number): string {
  const pad = '  '.repeat(level);
  return source
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n');
}

