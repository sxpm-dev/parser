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
import { INDENT_STEP_SPACES, rebuildFnName } from './rebuild.ts';
import { jsString } from './strings.ts';

// The indent step in spaces — kept in sync with emit/rebuild.ts.
// Used when emitting the `__indentCol + N` expression in slot helper calls
// for indent-modified spans.
const CODEGEN_INDENT_STEP = INDENT_STEP_SPACES;

export function emitInverse(schema: InferredSchema): string {
  const targets = collectTargets(schema);
  const inverters: string[] = [];
  const dispatchers: string[] = [];
  const slotHelpers: string[] = [];

  // Feature 2: collect every (sorted-roles, target) pair used by any
  // multi-role recursive capture in the schema. We emit one
  // `__invertSlotMulti_<roles>_<target>` helper per pair, deduplicated
  // by the joined role names — so two schemas with the same role tuple
  // share the helper.
  const multiRoleCombos = collectMultiRoleCombos(schema, targets);
  // Same shape but for merge bodies — each merge IR needs a specialized
  // entry-dispatch helper that switches on the entry value's runtime type
  // (string → leaf-ref-shape role, object → dynKey/merge-shape role) and
  // calls one per-node dispatcher directly, avoiding the per-entry
  // try/catch chain the multi-role helper uses.
  const mergeCombos = collectMergeCombos(schema, targets);

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
    // Feature 2: per-target multi-role slot helpers. Each helper tries
    // every role's per-(NodeType, target) dispatcher in order, returning
    // the first whose discriminator matches. Built on top of the
    // single-role per-node dispatchers established by Gap C — see
    // `emitMultiRoleSlotHelper` for the routing logic.
    for (const roles of multiRoleCombos.get(target) ?? []) {
      slotHelpers.push(emitMultiRoleSlotHelper(roles, target));
    }
    for (const roles of mergeCombos.get(target) ?? []) {
      slotHelpers.push(emitMergeSlotHelper(roles, target, schema));
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
    return `function ${fnName}(value: any, __indentCol: number = 0): string {
${indent(assertion, 1)}
  return ${jsString(production.source.input)};
}`;
  }
  const body = emitInverseBody(ir, 'value', target, production);
  const rebuild = rebuildFnName(nodeName, prodIdx);
  return `function ${fnName}(value: any, __indentCol: number = 0): string {
  const captures: any = {};
${indent(body, 1)}
  return ${rebuild}(captures, __indentCol);
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
    case 'dynKey':
      return emitDynKeyBody(ir.keyCapture, ir.value, valueExpr, target, production);
    case 'merge':
      return emitMergeBody(ir.arrayCapture, valueExpr, target, production);
  }
}

/**
 * Emit the inverse for `dynKey($.<keyCapture>, value)`: assert the input is
 * a single-entry object, bind the key string into captures[keyCapture], then
 * recurse on the entry value via the value sub-IR.
 *
 * Throws on shape mismatch — that's what makes multi-role dispatch work: a
 * dynKey-bodied production whose value-IR expects a string will throw when
 * given an object entry value, letting the next role's dispatcher try.
 */
function emitDynKeyBody(
  keyCapture: string,
  valueIR: InverseIR,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  // Recurse on a fresh local — the value sub-IR operates on the entry's value,
  // not on the wrapping object.
  const inner = emitInverseBody(valueIR, '__dkVal', target, production);
  return [
    `if (${valueExpr} === null || typeof ${valueExpr} !== "object" || Array.isArray(${valueExpr})) {`,
    `  throw new Error("stringify: expected single-entry object for dynKey '${keyCapture}', got " + typeof ${valueExpr});`,
    `}`,
    `{`,
    `  const __dkKeys = Object.keys(${valueExpr});`,
    `  if (__dkKeys.length !== 1) {`,
    `    throw new Error("stringify: expected single-entry object for dynKey '${keyCapture}', got " + __dkKeys.length + " keys");`,
    `  }`,
    `  const __dkKey = __dkKeys[0]!;`,
    `  const __dkVal = (${valueExpr} as Record<string, unknown>)[__dkKey];`,
    `  captures${memberAccess(keyCapture)} = __dkKey;`,
    inner,
    `}`,
  ].join('\n');
}

/**
 * Emit the inverse for `merge($.<arrayCapture>)`: iterate the input
 * object's entries, wrap each as `{[k]: v}`, and dispatch through the
 * recursive role's per-node inverter (or multi-role helper for unions).
 * Each call returns a source string; collect them into the captures
 * array. The receiving span's rebuild walks this array.
 */
function emitMergeBody(
  arrayCapture: string,
  valueExpr: string,
  target: string,
  production: Production,
): string {
  const span = production.spans.find((s) => s.name === arrayCapture);
  if (!span || span.recursiveRoles.length === 0) {
    throw new Error(
      `inverse: merge('${arrayCapture}') on '${production.nodeType}' must reference a recursive repeats span (got ${span ? 'non-recursive' : 'unknown span'})`,
    );
  }
  const roles = span.recursiveRoles;
  // For the merge case we always go through the specialized merge slot
  // helper (emitted by emitMergeSlotHelper). It pre-classifies each role's
  // productions by entry-value-type bucket and dispatches directly without
  // the per-entry try/catch the generic multi-role helper uses. For huge
  // inputs the saving is on the order of 5×: a 1000-row CSS file with
  // ~9000 entries × 4 roles in the multi-role helper costs ~36K thrown
  // exceptions; the specialized helper makes one direct call per entry.
  const helper = mergeSlotHelperName(roles, target);
  return [
    `if (${valueExpr} === null || typeof ${valueExpr} !== "object" || Array.isArray(${valueExpr})) {`,
    `  throw new Error("stringify: expected object for merge '${arrayCapture}', got " + typeof ${valueExpr});`,
    `}`,
    `{`,
    `  const __mEntries = Object.entries(${valueExpr} as Record<string, unknown>);`,
    `  const __mArr: any[] = [];`,
    `  for (let __mI = 0; __mI < __mEntries.length; __mI++) {`,
    `    const __mK = __mEntries[__mI]![0];`,
    `    const __mV = __mEntries[__mI]![1];`,
    `    const __mWrapped: any = { [__mK]: __mV };`,
    `    __mArr.push(${helper}(__mWrapped, __mV, __indentCol));`,
    `  }`,
    `  captures${memberAccess(arrayCapture)} = __mArr;`,
    `}`,
  ].join('\n');
}

function mergeSlotHelperName(roles: ReadonlyArray<string>, target: string): string {
  return `__invertMergeEntry_${roles.map(jsIdent).join('_')}_${jsIdent(target)}`;
}

/**
 * Emit a merge slot helper for a given (roles, target). The helper takes a
 * single wrapped entry (`{[k]: v}`) AND a hoisted reference to the entry
 * value (`v`) so it can switch directly on `typeof v` without re-indexing,
 * then dispatches to whichever role's per-node dispatcher handles that
 * value-type bucket.
 *
 * Bucket assignment is by inspecting each role's productions' inverse-IR:
 *   - dynKey body with `value.kind === 'ref'` → string bucket (entry value
 *     is the leaf-captured string)
 *   - dynKey body with `value.kind ∈ {merge, dynKey, object}` → object
 *     bucket
 *   - dynKey body with `value.kind === 'array'` → array bucket
 *   - non-dynKey productions (template, plain object, etc.) → "any" bucket;
 *     we still try them, but they're after the type-matched ones
 *   - scalar-null bodies → skipped (production opted out of this target)
 */
function emitMergeSlotHelper(
  roles: ReadonlyArray<string>,
  target: string,
  schema: InferredSchema,
): string {
  const helperName = mergeSlotHelperName(roles, target);
  // Buckets keyed by entry-value type → ordered list of (role, prodIdx)
  // entries. Order within a bucket follows role-declaration order + then
  // production index, matching the existing multi-role helper convention.
  const stringBucket: string[] = [];
  const objectBucket: string[] = [];
  const arrayBucket: string[] = [];
  const anyBucket: string[] = [];
  for (const role of roles) {
    const info = schema.nodeTypes.get(role);
    if (!info) continue;
    for (let i = 0; i < info.productions.length; i++) {
      const entry = info.productions[i]!.renders.get(target);
      const ir = entry?.inverseDerived;
      if (!ir) continue;
      if (ir.kind === 'scalar' && ir.value === null) continue;
      const bucket = bucketForIR(ir);
      const call = `${nodeDispatcherName(role, target)}(__mWrapped, __indentCol)`;
      switch (bucket) {
        case 'string': stringBucket.push(call); break;
        case 'object': objectBucket.push(call); break;
        case 'array': arrayBucket.push(call); break;
        case 'any': anyBucket.push(call); break;
      }
    }
  }
  // Each bucket emits a sequence of probes. If only one production is in a
  // bucket we call it directly; multiple productions in the same bucket
  // fall back to a small try/catch chain (still much smaller than the
  // generic 1-of-N multi-role chain).
  const branchFor = (calls: ReadonlyArray<string>): string => {
    if (calls.length === 0) {
      return `  throw new Error("stringify: no production matches merge entry");`;
    }
    if (calls.length === 1) return `  return ${calls[0]};`;
    const lines: string[] = [];
    for (let i = 0; i < calls.length - 1; i++) {
      lines.push(`  try { return ${calls[i]}; } catch (_e) { /* try next */ }`);
    }
    lines.push(`  return ${calls[calls.length - 1]};`);
    return lines.join('\n');
  };
  const lines: string[] = [];
  lines.push(`function ${helperName}(__mWrapped: any, __mV: any, __indentCol: number = 0): string {`);
  if (stringBucket.length > 0) {
    lines.push(`  if (typeof __mV === "string") {`);
    lines.push(branchFor(stringBucket));
    lines.push(`  }`);
  }
  if (objectBucket.length > 0) {
    lines.push(`  if (__mV !== null && typeof __mV === "object" && !Array.isArray(__mV)) {`);
    lines.push(branchFor(objectBucket));
    lines.push(`  }`);
  }
  if (arrayBucket.length > 0) {
    lines.push(`  if (Array.isArray(__mV)) {`);
    lines.push(branchFor(arrayBucket));
    lines.push(`  }`);
  }
  if (anyBucket.length > 0) {
    // Wildcard productions — try after specific buckets.
    lines.push(branchFor(anyBucket));
  } else {
    lines.push(`  throw new Error("stringify: merge entry value type not handled by any production (${roles.join(', ')}; entry value type: " + typeof __mV + ")");`);
  }
  lines.push(`}`);
  return lines.join('\n');
}

// Compute the dispatcher's accept condition for a set of bare-ref branches.
// The condition expresses what JS value shapes the ref's capture span can
// produce. Returns the literal string 'always' to denote unconditional
// acceptance (emitter then drops the guard entirely).
function refsAcceptCondition(
  productions: ReadonlyArray<Production>,
  refs: ReadonlyArray<{ readonly prodIdx: number; readonly ir: InverseIR }>,
): string {
  // Track which JS shapes are admissible across all ref branches in this
  // dispatcher. Defaulting to 'no shape allowed' and unioning each branch's
  // shapes preserves "must be all of {a, b}" if every branch agrees.
  let acceptsNull = false;
  let acceptsString = false;
  let acceptsNumber = false;
  let acceptsBoolean = false;
  let acceptsArray = false;
  let acceptsObject = false;
  for (const b of refs) {
    if (b.ir.kind !== 'ref') continue;
    const refIR = b.ir;
    const prod = productions[b.prodIdx]!;
    const span = prod.spans.find((s) => s.name === refIR.capture);
    if (!span) {
      // Couldn't resolve — admit everything (conservative).
      return 'value !== undefined';
    }
    const hasRepeats = span.modifiers.some((m) => m.kind === 'repeats');
    const hasOptional = span.modifiers.some((m) => m.kind === 'optional');
    const isRecursive = span.recursiveRoles.length > 0;
    if (hasRepeats) {
      acceptsArray = true;
    } else if (isRecursive) {
      // Multi-role recursive span — could yield any shape (scalar, object,
      // array, etc.) depending on which role matched. Admit anything.
      return 'value !== undefined';
    } else {
      // Classed scalar capture (.string(), .number(), .until(), .ident(), …).
      // Use the class to narrow further.
      switch (span.class) {
        case 'string':
        case 'ident':
        case 'literal':
        case 'hex':
        case 'comment':
        case 'keyword':
        case 'operator':
          acceptsString = true;
          break;
        case 'number':
          acceptsNumber = true;
          break;
        default:
          // Unknown class — be conservative.
          return 'value !== undefined';
      }
    }
    if (hasOptional) acceptsNull = true;
  }
  const parts: string[] = [];
  if (acceptsNull) parts.push('value === null');
  if (acceptsString) parts.push('typeof value === "string"');
  if (acceptsNumber) parts.push('typeof value === "number"');
  if (acceptsBoolean) parts.push('typeof value === "boolean"');
  if (acceptsArray) parts.push('Array.isArray(value)');
  if (acceptsObject) parts.push('(typeof value === "object" && value !== null && !Array.isArray(value))');
  if (parts.length === 0) return 'value !== undefined';
  return parts.join(' || ');
}

function bucketForIR(ir: InverseIR): 'string' | 'object' | 'array' | 'any' {
  if (ir.kind !== 'dynKey') return 'any';
  switch (ir.value.kind) {
    case 'ref': return 'string';
    case 'merge':
    case 'dynKey':
    case 'object': return 'object';
    case 'array': return 'array';
    case 'scalar':
    case 'template': return 'any';
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
//
// `indentColExpr` is a JS expression (typically `"__indentCol"` or a
// literal like `"0"`) representing the current indent column. For indent-
// modified spans the child column is `indentColExpr + CODEGEN_INDENT_STEP`;
// for other spans it is passed through unchanged. Leaf helpers ignore it.
function slotHelperCall(
  capture: string,
  production: Production,
  target: string,
  valueExpr: string,
  indentColExpr = '__indentCol',
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
    // Indent-modified spans add CODEGEN_INDENT_STEP to the column so child
    // nodes receive the column at which THEIR indent children will live.
    // Non-indent spans pass the column through unchanged.
    const hasIndent = span.modifiers.some((m) => m.kind === 'indent');
    const childColExpr = hasIndent
      ? `${indentColExpr} + ${CODEGEN_INDENT_STEP}`
      : indentColExpr;
    if (roles.length === 1) {
      return `${nodeSlotHelperName(roles[0]!, target)}(${valueExpr}, ${childColExpr})`;
    }
    // Feature 2: multi-role recursive capture. The runtime value at each
    // array element is dispatched to whichever role's per-node inverse
    // dispatcher matches its shape — using the shared per-(roles, target)
    // helper emitted by `emitMultiRoleSlotHelper`.
    return `${multiRoleSlotHelperName(roles, target)}(${valueExpr}, ${childColExpr})`;
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
  // Strict end-of-input. If anything remains, this body did not actually
  // describe the input — surface a throw so dispatch can fall through to a
  // sibling production / role rather than silently returning a partial
  // rebuild. Required for spec rule 4 (bidirectional by default; failures
  // must not be runtime surprises). When the last capture consumed the
  // remainder explicitly (the helper above sets __pos = __s.length), the
  // check is a no-op.
  lines.push(
    `if (__pos !== __s.length) {`,
    `  throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");`,
    `}`,
  );
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
    const production = info.productions[i]!;
    const entry = production.renders.get(target);
    if (!entry || !entry.inverseDerived) continue;
    // `body: null` is ambiguous between two intents:
    //   - "Opt out of this target" (e.g. CSS Comment's `json: null` — the
    //     production parses real content with captures but the body discards
    //     them; null acts as a sentinel that `merge` filters out).
    //   - "This production yields the literal null value" (e.g. JSON
    //     `JsonNull` parses `literal('null')` and produces null).
    // Distinguish by capture presence: capture-less productions whose body
    // is the literal null are intentional null-yielders and belong in the
    // dispatcher's scalars branch. Capture-having productions are opt-outs.
    if (entry.inverseDerived.kind === 'scalar' && entry.inverseDerived.value === null) {
      const hasCaptures = production.spans.some((s) => s.name !== undefined);
      if (hasCaptures) continue;
    }
    branches.push({ nodeName: info.name, prodIdx: i, ir: entry.inverseDerived, target });
  }
  if (branches.length === 0) {
    return `function ${fnName}(value: any, __indentCol: number = 0): string {
  throw new Error("stringify: no productions declared for node '${info.name}' target '${target}'");
}`;
  }
  // Group by kind for fast dispatch.
  const objects = branches.filter((b) => b.ir.kind === 'object');
  const templates = branches.filter((b) => b.ir.kind === 'template');
  const scalars = branches.filter((b) => b.ir.kind === 'scalar');
  const refs = branches.filter((b) => b.ir.kind === 'ref');
  const arrays = branches.filter((b) => b.ir.kind === 'array');
  const dynKeys = branches.filter((b) => b.ir.kind === 'dynKey');
  const merges = branches.filter((b) => b.ir.kind === 'merge');

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
      const call = `${inverterName(c.branch.nodeName, c.branch.prodIdx, c.branch.target)}(value, __indentCol)`;
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
      const call = `${inverterName(b.nodeName, b.prodIdx, b.target)}(value, __indentCol)`;
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
      const call = `${inverterName(p.branch.nodeName, p.branch.prodIdx, p.branch.target)}(value, __indentCol)`;
      if (p.check === null) {
        lines.push(`  return ${call};`);
      } else {
        lines.push(`  if (${p.check}) return ${call};`);
      }
    }
    lines.push('}');
  }
  if (refs.length > 0) {
    // Bare-ref bodies (`ast: $.x`) — the dispatcher's accept condition
    // depends on what shape the capture span can produce:
    //   .repeats()          → array
    //   .of(roles)          → union (any shape — recursive role(s) decide)
    //   class/.until()      → string (or whatever the class captures)
    //   .optional() on any  → also allows null
    // Without this analysis we'd either miss valid inputs (e.g. JsonNull's
    // null) or accept invalid ones (e.g. a yaml-item ref accepting arrays
    // that belong to its parent's .repeats() slot).
    const cond = refsAcceptCondition(info.productions, refs);
    if (cond === 'always') {
      for (const b of refs) {
        const call = `${inverterName(b.nodeName, b.prodIdx, b.target)}(value, __indentCol)`;
        lines.push(`return ${call};`);
      }
    } else {
      lines.push(`if (${cond}) {`);
      for (const b of refs) {
        const call = `${inverterName(b.nodeName, b.prodIdx, b.target)}(value, __indentCol)`;
        lines.push(`  return ${call};`);
      }
      lines.push('}');
    }
  }
  if (scalars.length > 0) {
    for (const b of scalars) {
      const ir = b.ir as Extract<InverseIR, { kind: 'scalar' }>;
      const lit = jsLiteral(ir.value);
      const call = `${inverterName(b.nodeName, b.prodIdx, b.target)}(value, __indentCol)`;
      lines.push(`if (Object.is(value, ${lit})) return ${call};`);
    }
  }
  if (dynKeys.length > 0) {
    // Single-entry object shape. Discriminate productions by the runtime
    // type of the entry value, which is statically determined by the
    // production's value-IR kind (ref → string-leaf, merge/dynKey/object
    // → object). The matching production handles the actual capture
    // extraction in its body inverter.
    lines.push('if (value !== null && typeof value === "object" && !Array.isArray(value)) {');
    lines.push('  const __dkKeys = Object.keys(value);');
    lines.push('  if (__dkKeys.length === 1) {');
    lines.push('    const __dkV = (value as Record<string, unknown>)[__dkKeys[0]!];');
    for (const b of dynKeys) {
      const valueIR = (b.ir as Extract<InverseIR, { kind: 'dynKey' }>).value;
      const cond = dynKeyEntryTypeCondition(valueIR);
      const call = `${inverterName(b.nodeName, b.prodIdx, b.target)}(value, __indentCol)`;
      if (cond === 'true') lines.push(`    return ${call};`);
      else lines.push(`    if (${cond}) return ${call};`);
    }
    lines.push('  }');
    lines.push('}');
  }
  if (merges.length > 0) {
    // A merge body at the root of a node accepts any non-null, non-array
    // object — the body inverter iterates entries itself. Single production
    // expected per role at this layer (multiple merge-only productions for
    // one node type would be ambiguous; today only Stylesheet has this
    // shape).
    lines.push('if (value !== null && typeof value === "object" && !Array.isArray(value)) {');
    for (const b of merges) {
      const call = `${inverterName(b.nodeName, b.prodIdx, b.target)}(value, __indentCol)`;
      lines.push(`  return ${call};`);
    }
    lines.push('}');
  }

  lines.push(`throw new Error("stringify: no production matches for target '${target}' (value: " + JSON.stringify(value) + ")");`);

  return `function ${fnName}(value: any, __indentCol: number = 0): string {
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

/** JS condition expression on `__dkV` that's true when the entry value's
 *  runtime type matches the dynKey production's expected value-IR shape.
 *  Used by the per-node dispatcher to discriminate dynKey-bodied productions
 *  in the same role (e.g. CSS Declaration vs Rule when both have flat-shape
 *  `{ [key]: ... }` bodies — Decl expects string, Rule expects object). */
function dynKeyEntryTypeCondition(valueIR: InverseIR): string {
  switch (valueIR.kind) {
    case 'ref':
      // Leaf — the entry value is captured directly by a single
      // non-recursive span. In flat-json shapes that's a string.
      return 'typeof __dkV === "string"';
    case 'merge':
    case 'dynKey':
    case 'object':
      return '__dkV !== null && typeof __dkV === "object" && !Array.isArray(__dkV)';
    case 'array':
      return 'Array.isArray(__dkV)';
    case 'scalar':
    case 'template':
      // Falls through to "any" — uncommon in flat-shape bodies. If two
      // dynKey productions in the same role both reach this branch the
      // discrimination is undefined; declaration order wins.
      return 'true';
  }
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
  //   null/undefined → null (rebuild's optional-slot ternary checks for null;
  //                          coercing to "" would mask absent state and
  //                          leave dangling separators).
  //   string         → dispatch through the child node's inverter when it
  //                    accepts strings (string-template targets like 'html'
  //                    capture child substrings that still need to be
  //                    inverted back to source). Object-only dispatchers
  //                    throw, in which case the string is already
  //                    source-shaped and we pass it through.
  //   array          → array of inverted children (rebuild joins repeats
  //                    arrays with the correct separator via
  //                    __rebuildSlot(captures.x, sep); flattening here
  //                    would lose the per-element boundaries).
  //   object         → dispatch through the per-(NodeType, target) inverse
  //                    dispatcher to recursively rebuild the child into a
  //                    source string.
  //   other          → String(v).
  return `function ${helper}(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return ${childDispatch}(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = ${helper}(v[i], __indentCol);
        if (r != null) out.push(r);
      }
      return out;
    }
  }
  // null can be either an absent optional capture or an intentional null
  // value (e.g. JsonNull). Try the dispatcher first; on throw, treat as
  // absent (preserves optional-slot semantics for callers like rebuild's
  // optional-slot ternary).
  if (v === null) {
    try { return ${childDispatch}(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return ${childDispatch}(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return ${childDispatch}(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return ${childDispatch}(v, __indentCol); } catch (_e) { return String(v); }
}`;
}

// Feature 2: multi-role slot helper. A capture annotated with
// `.span(name, text, [Role1, Role2, ...])` produces values that may be
// instances of any of the listed roles. The helper recurses arrays
// element-wise, and for objects routes through each role's
// per-(NodeType, target) dispatcher in declared order — returning the
// first that succeeds (try/catch). String children also dispatch through
// each role (string-template targets like 'html' capture child substrings
// that still need to be inverted back to source); if no role accepts the
// string, it passes through unchanged so source-target captures (already
// source-shaped) round-trip cleanly.
//
// Determinism: the dispatcher within a single node-type is unambiguous
// post-`validateInverseDiscrimination`. Across roles, ordering is the
// schema-declared role order; if two roles share an indistinguishable
// production shape, the first role wins. `validateMultiRoleDiscrimination`
// surfaces a CompilerError when that would silently mis-route.
function emitMultiRoleSlotHelper(
  roles: ReadonlyArray<string>,
  target: string,
): string {
  const helper = multiRoleSlotHelperName(roles, target);
  const tryCalls: string[] = [];
  for (const role of roles) {
    const childDispatch = nodeDispatcherName(role, target);
    tryCalls.push(
      `    try { return ${childDispatch}(v, __indentCol); } catch (_e) { /* try next role */ }`,
    );
  }
  return `function ${helper}(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
${tryCalls.join('\n')}
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = ${helper}(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
${tryCalls.join('\n')}
    return null;
  }
  if (typeof v === "string") {
${tryCalls.join('\n')}
    return v;
  }
  if (typeof v === "object") {
${tryCalls.join('\n')}
    throw new Error("stringify: no role matched for multi-role capture (roles: ${roles.join(', ')}; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
${tryCalls.join('\n')}
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
  // The root dispatcher always starts with indentCol=0 (top-level context).
  // Per-node dispatchers accept __indentCol and thread it through but the
  // public stringify entry point never needs a caller-supplied column.
  return `function ${fnName}(value: any): string {
  return ${rootCall}(value, 0);
}`;
}

function nodeDispatcherName(nodeName: string, target: string): string {
  return `__dispatchInverse_${jsIdent(nodeName)}_${jsIdent(target)}`;
}

function nodeSlotHelperName(nodeName: string, target: string): string {
  return `__invertSlotFor_${jsIdent(nodeName)}_${jsIdent(target)}`;
}

// Feature 2: deterministic name for a multi-role slot helper. Roles are
// included in declaration order (not sorted) so the generated identifier
// reflects the dispatch order — the first role wins on ambiguous shapes.
function multiRoleSlotHelperName(
  roles: ReadonlyArray<string>,
  target: string,
): string {
  return `__invertSlotMulti_${roles.map((r) => jsIdent(r)).join('_')}_${jsIdent(target)}`;
}

// Feature 2: collect every (roles, target) combination used by any
// multi-role recursive capture in the schema. Keyed by target, with
// inner roles deduplicated by the joined role names so identical
// tuples emitted from multiple call sites share a single helper.
function collectMultiRoleCombos(
  schema: InferredSchema,
  targets: ReadonlyArray<string>,
): ReadonlyMap<string, ReadonlyArray<ReadonlyArray<string>>> {
  const out = new Map<string, ReadonlyArray<string>[]>();
  for (const target of targets) {
    const seen = new Map<string, ReadonlyArray<string>>();
    for (const info of schema.nodeTypes.values()) {
      for (const production of info.productions) {
        // Only consider productions that actually declare this target —
        // otherwise the slot helper would never be reached for that
        // (target, role-tuple) combination.
        if (!production.renders.has(target)) continue;
        for (const span of production.spans) {
          if (span.recursiveRoles.length <= 1) continue;
          const roles = [...span.recursiveRoles];
          const key = roles.join('|');
          if (!seen.has(key)) seen.set(key, roles);
        }
      }
    }
    out.set(target, [...seen.values()]);
  }
  return out;
}

/**
 * Collect (roles, target) pairs needed by merge-IR inverses. Each merge
 * body references a recursive repeats span — its `recursiveRoles` is the
 * combination we emit a specialized entry-dispatch helper for. Same
 * dedup convention as collectMultiRoleCombos.
 */
function collectMergeCombos(
  schema: InferredSchema,
  targets: ReadonlyArray<string>,
): ReadonlyMap<string, ReadonlyArray<ReadonlyArray<string>>> {
  const out = new Map<string, ReadonlyArray<string>[]>();
  for (const target of targets) {
    const seen = new Map<string, ReadonlyArray<string>>();
    for (const info of schema.nodeTypes.values()) {
      for (const production of info.productions) {
        const entry = production.renders.get(target);
        const ir = entry?.inverseDerived;
        if (!ir) continue;
        walkForMerge(ir, production, seen);
      }
    }
    out.set(target, [...seen.values()]);
  }
  return out;
}

/** Walk an InverseIR, registering every merge IR's role tuple into `seen`. */
function walkForMerge(
  ir: InverseIR,
  production: Production,
  seen: Map<string, ReadonlyArray<string>>,
): void {
  switch (ir.kind) {
    case 'merge': {
      const span = production.spans.find((s) => s.name === ir.arrayCapture);
      if (!span || span.recursiveRoles.length === 0) return;
      const roles = [...span.recursiveRoles];
      const key = roles.join('|');
      if (!seen.has(key)) seen.set(key, roles);
      return;
    }
    case 'dynKey':
      walkForMerge(ir.value, production, seen);
      return;
    case 'object':
      for (const f of ir.fields) {
        if (f.kind === 'inverse') walkForMerge(f.inverse, production, seen);
      }
      return;
    case 'array':
      for (const el of ir.elements) walkForMerge(el, production, seen);
      return;
    case 'scalar':
    case 'ref':
    case 'template':
      return;
  }
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
  return `export function stringify(value: unknown, options?: { target?: string }): string {
  const target = options?.target ?? __defaultTarget;
  if (!target) {
    throw new Error("stringify: missing target; pass options.target or set defaultTarget on the schema");
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

