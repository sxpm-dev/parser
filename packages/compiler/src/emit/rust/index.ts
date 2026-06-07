// Rust backend — Phase 6.0 skeleton.
//
// Emits a single self-contained `.rs` source file from an InferredSchema.
// Phase 6.0 scope is intentionally narrow so a second host-language target
// can land in tree without a multi-week rewrite. Currently supported:
//
//   - literal() spans (named and anonymous)
//   - ident() class spans (ascii [A-Za-z_][A-Za-z0-9_-]*)
//   - render body shapes: object literal with scalar / capture-ref fields,
//     bare capture-ref ($.name), null / boolean / number / string scalars
//   - one render target per production; the schema's defaultTarget or the
//     first declared target is used
//   - `whitespace: 'standard'` (skip ws between spans)
//
// Out of scope for Phase 6.0 (tracked as Phase 6.1+):
//
//   - .number() / .string() / .hex() / .operator() classes
//   - .optional() / .repeats() / .until() modifiers
//   - recursive spans, multi-production dispatch, role ladders
//   - inverse stringify, validate, tokenize public surface
//   - Pratt operator precedence; transparent passthroughs
//
// The generated file depends ONLY on the Rust standard library — no crates,
// no `serde_json`. A `Value` enum is inlined that mirrors the TS backend's
// AST shape closely enough that a differential test (Phase 6.5) can compare
// outputs after JSON normalization.
//
// rustc is not installed in this environment, so the snapshot test
// `rust-backend.test.ts` pins the emitted source rather than executing it.
// A future session with the Rust toolchain available will layer a
// compile-and-run smoke test.

import type { Backend } from '../backend.ts';
import { CompilerError, type InferredSchema, type Production, type ResolvedSpan } from '../../model.ts';
import { isStructureRef, isTemplate, type RenderBody } from '@parser2/parser';

export const RUST_BACKEND: Backend = {
  name: 'rust',
  fileExtension: '.rs',
  emit(schema: InferredSchema): string {
    return emitRustParser(schema);
  },
};

// ---------------------------------------------------------------------------
// Top-level emit
// ---------------------------------------------------------------------------

function emitRustParser(schema: InferredSchema): string {
  __anonSpanCounter = 0;
  const parts: string[] = [];
  parts.push(emitHeader(schema));
  parts.push(RUST_PREAMBLE);
  for (const info of schema.nodeTypes.values()) {
    if (info.productions.length === 0) continue;
    for (let i = 0; i < info.productions.length; i++) {
      parts.push(emitProductionFn(schema, info.productions[i]!, i));
    }
    parts.push(emitNodeTypeDispatcher(info.name, info.productions.length));
  }
  parts.push(emitRenderEntry(schema));
  return parts.join('\n\n') + '\n';
}

function emitHeader(schema: InferredSchema): string {
  return `// Auto-generated from packages/${schema.packageName}/src/schema.ts
// Do not edit by hand. Re-run \`npm run generate\` to refresh.
// (rust backend — see packages/compiler/src/emit/rust/)
#![allow(dead_code, unused_variables, non_snake_case, clippy::all)]`;
}

// ---------------------------------------------------------------------------
// Runtime preamble — Value + State + skip_ws + ident/digit predicates.
// Kept small and inline so the generated file has no external dependencies.
// ---------------------------------------------------------------------------

const RUST_PREAMBLE = `use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Array(Vec<Value>),
    Object(Vec<(String, Value)>),
}

impl Value {
    pub fn obj_get(&self, key: &str) -> Option<&Value> {
        if let Value::Object(fields) = self {
            for (k, v) in fields {
                if k == key {
                    return Some(v);
                }
            }
        }
        None
    }
}

impl fmt::Display for Value {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Value::Null => write!(f, "null"),
            Value::Bool(b) => write!(f, "{}", b),
            Value::Number(n) => write!(f, "{}", n),
            Value::String(s) => write!(f, "\\"{}\\"", s.replace('\\\\', "\\\\\\\\").replace('"', "\\\\\\"")),
            Value::Array(items) => {
                write!(f, "[")?;
                for (i, item) in items.iter().enumerate() {
                    if i > 0 { write!(f, ",")?; }
                    write!(f, "{}", item)?;
                }
                write!(f, "]")
            }
            Value::Object(fields) => {
                write!(f, "{{")?;
                for (i, (k, v)) in fields.iter().enumerate() {
                    if i > 0 { write!(f, ",")?; }
                    write!(f, "\\"{}\\":{}", k, v)?;
                }
                write!(f, "}}")
            }
        }
    }
}

struct State<'a> {
    input: &'a [u8],
    src: &'a str,
    pos: usize,
    max_pos: usize,
}

impl<'a> State<'a> {
    fn new(src: &'a str) -> Self {
        Self {
            input: src.as_bytes(),
            src,
            pos: 0,
            max_pos: 0,
        }
    }
}

fn skip_ws(state: &mut State) {
    while state.pos < state.input.len() {
        let b = state.input[state.pos];
        if b == b' ' || b == b'\\t' || b == b'\\n' || b == b'\\r' {
            state.pos += 1;
        } else {
            break;
        }
    }
}

fn is_ident_start(b: u8) -> bool {
    (b >= b'a' && b <= b'z') || (b >= b'A' && b <= b'Z') || b == b'_'
}

fn is_ident_cont(b: u8) -> bool {
    is_ident_start(b) || (b >= b'0' && b <= b'9') || b == b'-'
}

fn is_digit(b: u8) -> bool {
    b >= b'0' && b <= b'9'
}

fn opt_str(s: &Option<String>) -> Value {
    match s {
        Some(v) => Value::String(v.clone()),
        None => Value::Null,
    }
}

fn opt_value(v: &Option<Value>) -> Value {
    match v {
        Some(v) => v.clone(),
        None => Value::Null,
    }
}

fn match_literal(state: &mut State, lit: &str) -> bool {
    let bytes = lit.as_bytes();
    let end = state.pos + bytes.len();
    if end > state.input.len() {
        return false;
    }
    if &state.input[state.pos..end] != bytes {
        return false;
    }
    state.pos = end;
    true
}

fn syntax_error(state: &State) -> String {
    let pos = state.max_pos.max(state.pos);
    format!("parse error at byte offset {}", pos)
}`;

// ---------------------------------------------------------------------------
// Per-production parse function
// ---------------------------------------------------------------------------

function emitProductionFn(schema: InferredSchema, production: Production, altIdx: number): string {
  const fnName = `parse_${rustIdent(production.nodeType)}__alt${altIdx}`;
  const lines: string[] = [];
  lines.push(`fn ${fnName}(state: &mut State) -> Option<Value> {`);
  lines.push(`    let entry_pos = state.pos;`);

  for (let i = 0; i < production.spans.length; i++) {
    const span = production.spans[i]!;
    if (i > 0) lines.push(`    skip_ws(state);`);
    emitSpan(lines, span, schema);
  }

  const renderBody = pickRenderBody(production);
  if (renderBody === undefined) {
    throw new CompilerError(
      `rust backend: production for '${production.nodeType}' has no render bodies`,
    );
  }
  lines.push(`    Some(${emitRenderBody(renderBody, production)})`);
  lines.push(`}`);
  return lines.join('\n');
}

function emitSpan(lines: string[], span: ResolvedSpan, schema: InferredSchema): void {
  // Phase 6.2/6.3: optional/until/repeats supported on leaf + recursive
  // spans. Other modifiers (ws / line-terminator policies, indent) still
  // out of scope.
  const supported = new Set(['optional', 'until', 'repeats']);
  const unsupportedMods = span.modifiers.filter((m) => !supported.has(m.kind));
  if (unsupportedMods.length > 0) {
    throw new CompilerError(
      `rust backend (Phase 6.2): span modifiers not yet supported (got [${unsupportedMods.map((m) => m.kind).join(', ')}])`,
    );
  }
  const isRecursive = span.recursiveRoles.length > 0;
  const isOptional = span.modifiers.some((m) => m.kind === 'optional');
  const repeatsMod = span.modifiers.find((m) => m.kind === 'repeats');
  const untilMod = span.modifiers.find((m) => m.kind === 'until');
  // Phase 6.3 — repeats on a recursive span: collect a Vec<Value>.
  if (repeatsMod !== undefined) {
    if (!isRecursive) {
      throw new CompilerError(
        `rust backend: .repeats() requires a recursive role (got class '${span.class}')`,
      );
    }
    if (isOptional || untilMod !== undefined) {
      throw new CompilerError(
        `rust backend (Phase 6.3): .repeats() combined with other modifiers not yet supported`,
      );
    }
    emitRepeatsRecursiveSpan(lines, span, repeatsMod as RepeatsModifier);
    return;
  }
  // Phase 6.3 — plain recursive span (single or multi role).
  if (isRecursive) {
    if (untilMod !== undefined) {
      throw new CompilerError(
        `rust backend: recursive span cannot also be .until()`,
      );
    }
    if (isOptional) {
      emitOptionalRecursiveSpan(lines, span);
      return;
    }
    emitRecursiveSpan(lines, span);
    return;
  }
  if (untilMod !== undefined) {
    if (isOptional) {
      throw new CompilerError(
        `rust backend (Phase 6.2): .until() + .optional() combo not yet supported`,
      );
    }
    emitUntilSpan(lines, span, untilMod as { stops: ReadonlyArray<string>; balanced: boolean; trim: boolean });
    return;
  }
  if (isOptional) {
    emitOptionalSpan(lines, span);
    return;
  }
  if (span.class === 'literal') {
    if (span.text === undefined) {
      throw new CompilerError(`rust backend: literal span missing text`);
    }
    const startVar = span.name ? `let __${rustIdent(span.name)}_start = state.pos;\n    ` : '';
    lines.push(
      `    ${startVar}if !match_literal(state, ${rustString(span.text)}) {\n` +
        `        if state.pos > state.max_pos { state.max_pos = state.pos; }\n` +
        `        state.pos = entry_pos;\n` +
        `        return None;\n` +
        `    }`,
    );
    return;
  }
  if (span.class === 'ident') {
    emitClassSpan(lines, span, {
      startPredicate: `is_ident_start(state.input[state.pos])`,
      contPredicate: `is_ident_cont(state.input[state.pos])`,
    });
    return;
  }
  if (span.class === 'number') {
    // Phase 6.1: integer-or-decimal number. The .int() refinement narrows
    // to `[0-9]+`; without it we also allow an optional `.<digits>` and
    // an optional `[eE][+-]?[0-9]+` exponent. Sign is NOT consumed here —
    // unary minus belongs to the unary-prefix path (Phase 5).
    const isInt = span.refinements.some((r) => r.name === 'int');
    const contPredicate = `is_digit(state.input[state.pos])`;
    emitClassSpan(lines, span, {
      startPredicate: `is_digit(state.input[state.pos])`,
      contPredicate,
      afterContScan: isInt ? '' : NUMBER_FRACTION_EXPONENT_SCAN,
    });
    return;
  }
  if (span.class === 'string') {
    // Phase 6.1: quoted string with one of doubleQuoted / singleQuoted /
    // backtick refinements. Default (no refinement) accepts double-quoted.
    const quote = stringQuoteChar(span);
    emitQuotedStringSpan(lines, span, quote);
    return;
  }
  throw new CompilerError(
    `rust backend (Phase 6.0): span class '${span.class}' not yet supported`,
  );
}

// Shared emitter for class spans that scan `start` then `cont*`. Optionally
// runs an additional scan after the main loop (e.g. number's fractional /
// exponent tail).
function emitClassSpan(
  lines: string[],
  span: ResolvedSpan,
  parts: {
    readonly startPredicate: string;
    readonly contPredicate: string;
    readonly afterContScan?: string;
  },
): void {
  const startVar = `__${rustIdent(span.name ?? 'anon')}_start`;
  const endVar = `__${rustIdent(span.name ?? 'anon')}_end`;
  const tail = parts.afterContScan ? `\n${parts.afterContScan}` : '';
  lines.push(
    `    let ${startVar} = state.pos;\n` +
      `    if state.pos >= state.input.len() || !(${parts.startPredicate}) {\n` +
      `        if state.pos > state.max_pos { state.max_pos = state.pos; }\n` +
      `        state.pos = entry_pos;\n` +
      `        return None;\n` +
      `    }\n` +
      `    state.pos += 1;\n` +
      `    while state.pos < state.input.len() && (${parts.contPredicate}) {\n` +
      `        state.pos += 1;\n` +
      `    }${tail}\n` +
      `    let ${endVar} = state.pos;`,
  );
  if (span.name !== undefined) {
    const v = rustIdent(span.name);
    lines.push(`    let ${v}: String = state.src[${startVar}..${endVar}].to_string();`);
  }
}

function emitQuotedStringSpan(lines: string[], span: ResolvedSpan, quote: string): string | void {
  const startVar = `__${rustIdent(span.name ?? 'anon')}_start`;
  const endVar = `__${rustIdent(span.name ?? 'anon')}_end`;
  const quoteByte = `b${rustChar(quote)}`;
  lines.push(
    `    let ${startVar} = state.pos;\n` +
      `    if state.pos >= state.input.len() || state.input[state.pos] != ${quoteByte} {\n` +
      `        if state.pos > state.max_pos { state.max_pos = state.pos; }\n` +
      `        state.pos = entry_pos;\n` +
      `        return None;\n` +
      `    }\n` +
      `    state.pos += 1;\n` +
      `    while state.pos < state.input.len() {\n` +
      `        let b = state.input[state.pos];\n` +
      `        if b == b'\\\\' && state.pos + 1 < state.input.len() {\n` +
      `            state.pos += 2;\n` +
      `            continue;\n` +
      `        }\n` +
      `        if b == ${quoteByte} {\n` +
      `            state.pos += 1;\n` +
      `            break;\n` +
      `        }\n` +
      `        state.pos += 1;\n` +
      `    }\n` +
      `    let ${endVar} = state.pos;`,
  );
  if (span.name !== undefined) {
    const v = rustIdent(span.name);
    lines.push(`    let ${v}: String = state.src[${startVar}..${endVar}].to_string();`);
  }
}

// Phase 6.2: .optional() — emit a once-around labeled loop whose value is
// `Option<String>`. Inside, we run the same scan body as the non-optional
// case but `break 'opt None` on any failure path and `break 'opt Some(...)`
// at the end. The outer body then rolls back state.pos on None and binds
// the named capture for the render-body emit.
function emitOptionalSpan(lines: string[], span: ResolvedSpan): void {
  // Fast path for the most common case — unnamed optional literal spans
  // (pure tolerance, no capture, no render-body reference). One-liner:
  // `let _ = match_literal(state, "text");` — match_literal already
  // leaves state.pos unchanged on miss.
  if (span.name === undefined && span.class === 'literal') {
    if (span.text === undefined) throw new CompilerError(`rust backend: literal span missing text`);
    lines.push(`    let _ = match_literal(state, ${rustString(span.text)});`);
    return;
  }
  const snapVar = `__${rustIdent(span.name ?? 'anon')}_snapshot`;
  const captureName = span.name ? rustIdent(span.name) : `__anon_${anonCounter()}`;
  const inner: string[] = [];
  inner.push(`        let __entry_opt = state.pos;`);
  if (span.class === 'literal') {
    if (span.text === undefined) throw new CompilerError(`rust backend: literal span missing text`);
    inner.push(`        let __opt_start = state.pos;`);
    inner.push(`        if !match_literal(state, ${rustString(span.text)}) {`);
    inner.push(`            state.pos = __entry_opt;`);
    inner.push(`            break 'opt None;`);
    inner.push(`        }`);
    inner.push(`        break 'opt Some(${rustString(span.text)}.to_string());`);
  } else if (span.class === 'ident') {
    inner.push(`        if state.pos >= state.input.len() || !is_ident_start(state.input[state.pos]) {`);
    inner.push(`            state.pos = __entry_opt;`);
    inner.push(`            break 'opt None;`);
    inner.push(`        }`);
    inner.push(`        let __opt_start = state.pos;`);
    inner.push(`        state.pos += 1;`);
    inner.push(`        while state.pos < state.input.len() && is_ident_cont(state.input[state.pos]) {`);
    inner.push(`            state.pos += 1;`);
    inner.push(`        }`);
    inner.push(`        break 'opt Some(state.src[__opt_start..state.pos].to_string());`);
  } else if (span.class === 'number') {
    const isInt = span.refinements.some((r) => r.name === 'int');
    inner.push(`        if state.pos >= state.input.len() || !is_digit(state.input[state.pos]) {`);
    inner.push(`            state.pos = __entry_opt;`);
    inner.push(`            break 'opt None;`);
    inner.push(`        }`);
    inner.push(`        let __opt_start = state.pos;`);
    inner.push(`        state.pos += 1;`);
    inner.push(`        while state.pos < state.input.len() && is_digit(state.input[state.pos]) {`);
    inner.push(`            state.pos += 1;`);
    inner.push(`        }`);
    if (!isInt) {
      inner.push(NUMBER_FRACTION_EXPONENT_SCAN.replace(/^    /gm, '        '));
    }
    inner.push(`        break 'opt Some(state.src[__opt_start..state.pos].to_string());`);
  } else if (span.class === 'string') {
    const quote = stringQuoteChar(span);
    const quoteByte = `b${rustChar(quote)}`;
    inner.push(`        if state.pos >= state.input.len() || state.input[state.pos] != ${quoteByte} {`);
    inner.push(`            state.pos = __entry_opt;`);
    inner.push(`            break 'opt None;`);
    inner.push(`        }`);
    inner.push(`        let __opt_start = state.pos;`);
    inner.push(`        state.pos += 1;`);
    inner.push(`        while state.pos < state.input.len() {`);
    inner.push(`            let b = state.input[state.pos];`);
    inner.push(`            if b == b'\\\\' && state.pos + 1 < state.input.len() {`);
    inner.push(`                state.pos += 2;`);
    inner.push(`                continue;`);
    inner.push(`            }`);
    inner.push(`            if b == ${quoteByte} {`);
    inner.push(`                state.pos += 1;`);
    inner.push(`                break;`);
    inner.push(`            }`);
    inner.push(`            state.pos += 1;`);
    inner.push(`        }`);
    inner.push(`        break 'opt Some(state.src[__opt_start..state.pos].to_string());`);
  } else {
    throw new CompilerError(
      `rust backend (Phase 6.2): optional span class '${span.class}' not yet supported`,
    );
  }
  const block = `    let ${snapVar} = state.pos;\n` +
    `    let ${captureName}: Option<String> = 'opt: loop {\n` +
    inner.join('\n') + `\n` +
    `    };\n` +
    `    if ${captureName}.is_none() { state.pos = ${snapVar}; }`;
  lines.push(block);
}

let __anonSpanCounter = 0;
function anonCounter(): number {
  return __anonSpanCounter++;
}

type RepeatsModifier = {
  readonly kind: 'repeats';
  readonly sep?: string;
  readonly trailing?: 'allowed' | 'required' | 'forbidden';
  readonly min?: number;
  readonly max?: number;
};

// Phase 6.3 — plain recursive span: call into the role's parser. For
// multi-role spans, try each role in declaration order, rolling back
// state.pos on miss; the first hit wins. On total failure, propagate
// None to the caller (which rolls back the whole production).
function emitRecursiveSpan(lines: string[], span: ResolvedSpan): void {
  const captureName = span.name ? rustIdent(span.name) : '_';
  const bind = span.name !== undefined ? `let ${captureName}: Value = ` : `let _ = `;
  if (span.recursiveRoles.length === 1) {
    const role = rustIdent(span.recursiveRoles[0]!);
    lines.push(
      `    ${bind}match parse_${role}(state) {\n` +
        `        Some(v) => v,\n` +
        `        None => { state.pos = entry_pos; return None; }\n` +
        `    };`,
    );
    return;
  }
  // Multi-role: try each in order.
  const branches: string[] = [];
  branches.push(`    let __rec_snapshot = state.pos;`);
  branches.push(`    ${bind}'rec: loop {`);
  for (const role of span.recursiveRoles) {
    const r = rustIdent(role);
    branches.push(`        state.pos = __rec_snapshot;`);
    branches.push(`        if let Some(v) = parse_${r}(state) { break 'rec v; }`);
  }
  branches.push(`        state.pos = entry_pos;`);
  branches.push(`        return None;`);
  branches.push(`    };`);
  lines.push(branches.join('\n'));
}

// Phase 6.3 — optional recursive span: same dispatch as non-optional,
// but yields Option<Value> with rollback on miss instead of producing
// a hard failure.
function emitOptionalRecursiveSpan(lines: string[], span: ResolvedSpan): void {
  const captureName = span.name ? rustIdent(span.name) : `__anon_${anonCounter()}`;
  const snapVar = `__${captureName}_snapshot`;
  const branches: string[] = [];
  branches.push(`    let ${snapVar} = state.pos;`);
  branches.push(`    let ${captureName}: Option<Value> = 'opt: loop {`);
  for (const role of span.recursiveRoles) {
    const r = rustIdent(role);
    branches.push(`        state.pos = ${snapVar};`);
    branches.push(`        if let Some(v) = parse_${r}(state) { break 'opt Some(v); }`);
  }
  branches.push(`        state.pos = ${snapVar};`);
  branches.push(`        break 'opt None;`);
  branches.push(`    };`);
  lines.push(branches.join('\n'));
}

// Phase 6.3 — recursive span with .repeats({sep?, min?, max?, trailing?}).
// Emits a loop that calls the recursive parser, optionally consumes a
// separator literal between iterations, and collects into Vec<Value>.
// `min` enforces a floor on iterations; `max` (if set) caps the count.
// `trailing: 'allowed' | 'required' | 'forbidden'` (default 'forbidden')
// constrains the sep after the last item.
function emitRepeatsRecursiveSpan(
  lines: string[],
  span: ResolvedSpan,
  modifier: RepeatsModifier,
): void {
  const captureName = span.name ? rustIdent(span.name) : `__anon_${anonCounter()}`;
  const min = modifier.min ?? 0;
  const max = modifier.max ?? null;
  const sep = modifier.sep;
  const trailing = modifier.trailing ?? 'forbidden';
  const body: string[] = [];
  body.push(`    let mut ${captureName}: Vec<Value> = Vec::new();`);
  body.push(`    loop {`);
  if (max !== null) {
    body.push(`        if ${captureName}.len() >= ${max} { break; }`);
  }
  body.push(`        let __iter_snapshot = state.pos;`);
  body.push(`        skip_ws(state);`);
  // Try one of the recursive roles.
  if (span.recursiveRoles.length === 1) {
    const role = rustIdent(span.recursiveRoles[0]!);
    body.push(`        let __item = parse_${role}(state);`);
  } else {
    body.push(`        let __item: Option<Value> = 'role: loop {`);
    for (const role of span.recursiveRoles) {
      const r = rustIdent(role);
      body.push(`            state.pos = __iter_snapshot;`);
      body.push(`            skip_ws(state);`);
      body.push(`            if let Some(v) = parse_${r}(state) { break 'role Some(v); }`);
    }
    body.push(`            state.pos = __iter_snapshot;`);
    body.push(`            break 'role None;`);
    body.push(`        };`);
  }
  body.push(`        match __item {`);
  body.push(`            Some(v) => ${captureName}.push(v),`);
  body.push(`            None => { state.pos = __iter_snapshot; break; }`);
  body.push(`        }`);
  // Separator handling. Without a sep, iterations are space-separated.
  if (sep !== undefined && sep !== '') {
    body.push(`        let __sep_snapshot = state.pos;`);
    body.push(`        skip_ws(state);`);
    body.push(`        if !match_literal(state, ${rustString(sep)}) {`);
    body.push(`            state.pos = __sep_snapshot;`);
    body.push(`            break;`);
    body.push(`        }`);
    if (trailing === 'forbidden') {
      // Trailing-sep forbidden: peek for another item; if none, roll back
      // the sep we just consumed and exit the loop.
      body.push(`        let __peek_snapshot = state.pos;`);
      body.push(`        skip_ws(state);`);
      const probe = span.recursiveRoles
        .map((r) => `parse_${rustIdent(r)}(state).is_some()`)
        .join(' || ');
      body.push(`        let __can_continue = ${probe};`);
      body.push(`        state.pos = __peek_snapshot;`);
      body.push(`        if !__can_continue {`);
      body.push(`            state.pos = __sep_snapshot;`);
      body.push(`            break;`);
      body.push(`        }`);
    }
    // 'allowed' / 'required' — keep the consumed sep; loop continues.
  }
  body.push(`    }`);
  if (min > 0) {
    body.push(`    if ${captureName}.len() < ${min} {`);
    body.push(`        if state.pos > state.max_pos { state.max_pos = state.pos; }`);
    body.push(`        state.pos = entry_pos;`);
    body.push(`        return None;`);
    body.push(`    }`);
  }
  if (modifier.trailing === 'required') {
    // The loop only exits when no sep was found; if 'required', that
    // exit path is wrong. Emit a guard: the post-loop state.pos must
    // sit just past a sep. Simplest implementation: re-check that the
    // previous-iteration sep was actually consumed by tracking a flag.
    // Deferred to a follow-up — neither cron nor iso-duration uses it.
    throw new CompilerError(
      `rust backend (Phase 6.3): trailing: 'required' not yet supported on .repeats()`,
    );
  }
  lines.push(body.join('\n'));
}

// Phase 6.2: .until([stops...]) — opaque source-slice capture. Walks the
// input char-by-char tracking `() [] {}` depth (when `balanced` is true,
// the default). At depth 0, if the input at the current position starts
// with any of the stop literals, the scan stops WITHOUT consuming the
// stop (the next span does that). On depth-0 closing-bracket, the scan
// stops too (the closing bracket belongs to an enclosing block).
// When `trim` is true (default) the captured slice is trim'd before
// being bound.
function emitUntilSpan(
  lines: string[],
  span: ResolvedSpan,
  modifier: { stops: ReadonlyArray<string>; balanced: boolean; trim: boolean },
): void {
  const startVar = `__${rustIdent(span.name ?? 'anon')}_start`;
  const endVar = `__${rustIdent(span.name ?? 'anon')}_end`;
  const stopArrayItems = modifier.stops.map((s) => rustString(s)).join(', ');
  const stopArray = `[${stopArrayItems}]`;
  const balanced = modifier.balanced;
  const body: string[] = [];
  body.push(`    let ${startVar} = state.pos;`);
  if (balanced) body.push(`    let mut __depth: i32 = 0;`);
  body.push(`    let __stops: &[&[u8]] = &${stopArray.replace(/"([^"]*)"/g, '$1.as_bytes()').replace(/\[/, '[&').replace(/, /g, ', ')};`);
  // The replace above is fragile; build the literal explicitly instead.
  body.pop();
  body.push(`    let __stops: &[&[u8]] = &[${modifier.stops.map((s) => `${rustString(s)}.as_bytes()`).join(', ')}];`);
  body.push(`    while state.pos < state.input.len() {`);
  body.push(`        let c = state.input[state.pos];`);
  if (balanced) {
    body.push(`        if __depth == 0 {`);
    body.push(`            let mut __stopped = false;`);
    body.push(`            for s in __stops.iter() {`);
    body.push(`                if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {`);
    body.push(`                    __stopped = true;`);
    body.push(`                    break;`);
    body.push(`                }`);
    body.push(`            }`);
    body.push(`            if __stopped { break; }`);
    body.push(`            if c == b')' || c == b']' || c == b'}' { break; }`);
    body.push(`        }`);
    body.push(`        if c == b'(' || c == b'[' || c == b'{' { __depth += 1; }`);
    body.push(`        else if c == b')' || c == b']' || c == b'}' { __depth -= 1; }`);
  } else {
    body.push(`        let mut __stopped = false;`);
    body.push(`        for s in __stops.iter() {`);
    body.push(`            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {`);
    body.push(`                __stopped = true;`);
    body.push(`                break;`);
    body.push(`            }`);
    body.push(`        }`);
    body.push(`        if __stopped { break; }`);
  }
  body.push(`        state.pos += 1;`);
  body.push(`    }`);
  body.push(`    let ${endVar} = state.pos;`);
  if (span.name !== undefined) {
    const v = rustIdent(span.name);
    if (modifier.trim) {
      body.push(`    let ${v}: String = state.src[${startVar}..${endVar}].trim().to_string();`);
    } else {
      body.push(`    let ${v}: String = state.src[${startVar}..${endVar}].to_string();`);
    }
  }
  lines.push(body.join('\n'));
}

function stringQuoteChar(span: ResolvedSpan): string {
  for (const ref of span.refinements) {
    if (ref.name === 'doubleQuoted') return '"';
    if (ref.name === 'singleQuoted') return "'";
    if (ref.name === 'backtick') return '`';
  }
  return '"';
}

// Phase 6.1: number tail-scan when .int() is NOT in effect. Consumes an
// optional `.<digits>` then an optional `[eE][+-]?<digits>`. Inlined so
// the function body stays straight-line.
const NUMBER_FRACTION_EXPONENT_SCAN = `    if state.pos < state.input.len() && state.input[state.pos] == b'.' {
        state.pos += 1;
        while state.pos < state.input.len() && is_digit(state.input[state.pos]) {
            state.pos += 1;
        }
    }
    if state.pos < state.input.len() && (state.input[state.pos] == b'e' || state.input[state.pos] == b'E') {
        state.pos += 1;
        if state.pos < state.input.len() && (state.input[state.pos] == b'+' || state.input[state.pos] == b'-') {
            state.pos += 1;
        }
        while state.pos < state.input.len() && is_digit(state.input[state.pos]) {
            state.pos += 1;
        }
    }`;

// ---------------------------------------------------------------------------
// Render-body emit
// ---------------------------------------------------------------------------

function pickRenderBody(production: Production): RenderBody | undefined {
  // Phase 6.0: pick the first declared render body. Eventually this should
  // honour schema.defaultTarget; for now a single-target schema is fine.
  for (const entry of production.renders.values()) return entry.body;
  return undefined;
}

function emitRenderBody(body: RenderBody, production: Production): string {
  if (body === null) return `Value::Null`;
  if (typeof body === 'boolean') return `Value::Bool(${body})`;
  if (typeof body === 'number') return `Value::Number(${body}_f64)`;
  if (typeof body === 'string') return `Value::String(${rustString(body)}.to_string())`;
  if (isStructureRef(body)) {
    if (body.__ref === 'span-value') {
      const sourceSpan = lookupNamedSpan(production, body.name);
      const ident = rustIdent(body.name);
      const isOptional = sourceSpan.modifiers.some((m) => m.kind === 'optional');
      const isRepeats = sourceSpan.modifiers.some((m) => m.kind === 'repeats');
      const isRecursive = sourceSpan.recursiveRoles.length > 0;
      // Phase 6.3: capture types differ by span shape.
      //   - .repeats(...) recursive → Vec<Value>           → Value::Array
      //   - .of(...) recursive optional → Option<Value>    → opt_value
      //   - .of(...) recursive          → Value (already)  → bare ident
      //   - class optional              → Option<String>   → opt_str
      //   - class                       → String           → Value::String
      if (isRepeats) return `Value::Array(${ident}.clone())`;
      if (isRecursive) {
        if (isOptional) return `opt_value(&${ident})`;
        return `${ident}.clone()`;
      }
      if (isOptional) return `opt_str(&${ident})`;
      return `Value::String(${ident}.clone())`;
    }
    if (body.__ref === 'span-presence') {
      const sourceSpan = lookupNamedSpan(production, body.name);
      if (!sourceSpan.modifiers.some((m) => m.kind === 'optional')) {
        throw new CompilerError(
          `rust backend: $.${body.name}.present requires .optional() on the span`,
        );
      }
      return `Value::Bool(${rustIdent(body.name)}.is_some())`;
    }
    throw new CompilerError(
      `rust backend (Phase 6.0): structure ref '${body.__ref}' not yet supported`,
    );
  }
  if (isTemplate(body)) {
    throw new CompilerError(`rust backend (Phase 6.0): Template render bodies not yet supported`);
  }
  if (Array.isArray(body)) {
    const items = body.map((item) => emitRenderBody(item, production));
    return `Value::Array(vec![${items.join(', ')}])`;
  }
  if (typeof body === 'object') {
    const fields: string[] = [];
    for (const [k, v] of Object.entries(body as Record<string, RenderBody>)) {
      const valueExpr = emitRenderBody(v, production);
      fields.push(`(${rustString(k)}.to_string(), ${valueExpr})`);
    }
    return `Value::Object(vec![${fields.join(', ')}])`;
  }
  throw new CompilerError(`rust backend: unsupported render body shape: ${typeof body}`);
}

function lookupNamedSpan(production: Production, name: string): ResolvedSpan {
  for (const span of production.spans) {
    if (span.name === name) return span;
  }
  throw new CompilerError(
    `rust backend: render body references $.${name} but no span with that name in production for ${production.nodeType}`,
  );
}

// ---------------------------------------------------------------------------
// Per-NodeType dispatcher: try each alt in order; first to succeed wins.
// ---------------------------------------------------------------------------

function emitNodeTypeDispatcher(nodeType: string, altCount: number): string {
  const fn = `parse_${rustIdent(nodeType)}`;
  const lines: string[] = [];
  lines.push(`fn ${fn}(state: &mut State) -> Option<Value> {`);
  for (let i = 0; i < altCount; i++) {
    lines.push(`    let snapshot = state.pos;`);
    lines.push(`    if let Some(v) = parse_${rustIdent(nodeType)}__alt${i}(state) {`);
    lines.push(`        return Some(v);`);
    lines.push(`    }`);
    lines.push(`    state.pos = snapshot;`);
  }
  lines.push(`    None`);
  lines.push(`}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public `render(input)` entry point.
// ---------------------------------------------------------------------------

function emitRenderEntry(schema: InferredSchema): string {
  const root = rustIdent(schema.rootType);
  return `pub fn render(input: &str) -> Result<Value, String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_${root}(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}`;
}

// ---------------------------------------------------------------------------
// String / identifier helpers
// ---------------------------------------------------------------------------

function rustString(text: string): string {
  // Rust string literal: double-quoted, escape \\ and ", non-printables.
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

function rustIdent(name: string): string {
  // Rust identifier: replace illegal chars with underscores. Names are
  // already kebab-or-camel from the schema; conservatively replace anything
  // not [A-Za-z0-9_].
  return name.replace(/[^A-Za-z0-9_]/g, '_');
}

function rustChar(ch: string): string {
  // Rust byte-char literal: `b'x'`. Escape \, ', and non-printables.
  if (ch === '\\') return "'\\\\'";
  if (ch === "'") return "'\\''";
  if (ch === '\n') return "'\\n'";
  if (ch === '\r') return "'\\r'";
  if (ch === '\t') return "'\\t'";
  return `'${ch}'`;
}
