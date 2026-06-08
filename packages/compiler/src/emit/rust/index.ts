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
import { CompilerError, type InferredSchema, type NodeTypeInfo, type Production, type ResolvedSpan } from '../../model.ts';
import { isStructureRef, isTemplate, type RenderBody, type StructureRef } from '@parser2/parser';
import { detectPrefixShare, type PrefixShare } from '../v2/prefix-share-dispatch.ts';

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
    // Phase 6.5 follow-up #1 — generic shared-prefix factoring. When >=2
    // alts share a byte-identical K-span prefix and split on a literal
    // token after it, the parser fan-out for the losing alts re-parses
    // the prefix from scratch (pg-select.Select: 4 alts re-parsing
    // `SELECT cols FROM table` four times). The factored dispatcher
    // parses the prefix ONCE, peeks the next literal, and routes to the
    // matching alt tail with the prefix captures forwarded as params.
    // Mirrors the TS-backend logic in emit/v2/prefix-share-dispatch.ts.
    const prefixShare = info.productions.length > 1 ? detectPrefixShare(info) : null;
    const prefixCaps = prefixShare !== null ? prefixCaptureParams(info, prefixShare) : null;
    for (let i = 0; i < info.productions.length; i++) {
      parts.push(emitProductionFn(schema, info.productions[i]!, i, prefixCaps));
    }
    if (prefixShare !== null && prefixCaps !== null) {
      parts.push(emitPrefixShareDispatcherRust(schema, info, prefixShare, prefixCaps));
    } else {
      parts.push(emitNodeTypeDispatcher(info.name, info.productions));
    }
    // Phase 6.4 — per-production inverse + per-node dispatcher.
    // Collect every sibling alt's render body up-front so each alt's
    // stringify can compute "fields present in other alts but absent
    // here" and emit a must-be-absent discriminator (closes the
    // pg-select / iso-duration alt-over-match stringify mismatches).
    const siblingBodies = info.productions.map((p) => pickRenderBody(p));
    for (let i = 0; i < info.productions.length; i++) {
      const fn = emitStringifyAltFn(schema, info.productions[i]!, i, siblingBodies, i);
      if (fn !== null) parts.push(fn);
    }
    parts.push(emitStringifyDispatcher(info.name, info.productions.length));
  }
  parts.push(emitRenderEntry(schema));
  parts.push(emitStringifyEntry(schema));
  parts.push(WASM_EXPORTS);
  return parts.join('\n\n') + '\n';
}

// Phase 6.6 — wasm32 ABI export. The render / stringify functions are
// pure Rust + std (no I/O, no env access) so the emitted source already
// compiles to `wasm32-unknown-unknown`. What's missing is a C ABI
// surface a JS host can drive — Rust's `String` / `Result` are not
// `repr(C)` shapes the host can interpret.
//
// This block emits four `#[no_mangle] extern "C"` functions, gated on
// `#[cfg(target_arch = "wasm32")]` so native builds stay byte-identical:
//
//   parser_alloc(size)            → *mut u8  (allocate `size` bytes)
//   parser_dealloc(ptr, size)               (free a buffer previously
//                                            handed out by parser_alloc)
//   parser_render(in_ptr, in_len) → out_len  (parse input bytes; stash
//                                            the render output as a
//                                            UTF-8 byte buffer; return
//                                            its length)
//   parser_stringify(in_ptr, in_len) → out_len  (inverse: input is the
//                                            render output's UTF-8
//                                            bytes; output is the
//                                            stringified source)
//   parser_result_ptr()           → *const u8 (pointer to the last
//                                            result buffer)
//
// The host (browser JS or any wasm runtime) writes the input bytes to
// the shared linear memory via parser_alloc, calls parser_render /
// parser_stringify, reads back result bytes from parser_result_ptr +
// length, and calls parser_dealloc to free the input buffer. The
// stringify input is the canonical Display form of `Value` (same
// format the native `format!("{}", v)` driver uses), so a host can
// round-trip a render result straight back through stringify.
//
// Deliberately no wasm-bindgen dependency: the emit's pledge is "no
// external runtime", and a hand-rolled C ABI keeps that intact. JS
// host bindings are small enough to write by hand; if a future schema
// wants ergonomic JS types the host owns that translation.
const WASM_EXPORTS = `#[cfg(target_arch = "wasm32")]
mod __wasm_exports {
    use super::*;

    // Result-buffer slot. We keep ONE buffer live at a time; the host
    // is expected to call parser_render OR parser_stringify, then read
    // parser_result_ptr() + the returned length, before the next call.
    // Mutating a static is safe in single-threaded wasm32; wrap in a
    // dedicated cell so the borrow checker stays out of the way.
    static mut LAST_RESULT: Vec<u8> = Vec::new();

    #[no_mangle]
    pub extern "C" fn parser_alloc(size: usize) -> *mut u8 {
        let mut buf: Vec<u8> = Vec::with_capacity(size);
        let ptr = buf.as_mut_ptr();
        core::mem::forget(buf);
        ptr
    }

    #[no_mangle]
    pub unsafe extern "C" fn parser_dealloc(ptr: *mut u8, size: usize) {
        // Reclaim via Vec::from_raw_parts; capacity == size by
        // construction in parser_alloc.
        let _ = Vec::from_raw_parts(ptr, size, size);
    }

    #[no_mangle]
    pub unsafe extern "C" fn parser_render(in_ptr: *const u8, in_len: usize) -> usize {
        let bytes = core::slice::from_raw_parts(in_ptr, in_len);
        let input = match core::str::from_utf8(bytes) {
            Ok(s) => s,
            Err(_) => {
                LAST_RESULT = b"ERR:non-utf8 input".to_vec();
                return LAST_RESULT.len();
            }
        };
        let out = match render(input) {
            Ok(v) => format!("{}", v),
            Err(e) => format!("ERR:{}", e),
        };
        LAST_RESULT = out.into_bytes();
        LAST_RESULT.len()
    }

    #[no_mangle]
    pub unsafe extern "C" fn parser_stringify(in_ptr: *const u8, in_len: usize) -> usize {
        // The wasm host hands us a canonical render output (the same
        // bytes parser_render emitted). Round-tripping it requires
        // first deserializing to Value; full JSON-style parsing of
        // the Display form is out of scope for this thin shim — for
        // now we expose a stringify that takes the raw input and
        // parses + re-stringifies in one call, which is the common
        // "format / normalize" workflow.
        let bytes = core::slice::from_raw_parts(in_ptr, in_len);
        let input = match core::str::from_utf8(bytes) {
            Ok(s) => s,
            Err(_) => {
                LAST_RESULT = b"ERR:non-utf8 input".to_vec();
                return LAST_RESULT.len();
            }
        };
        let out = match render(input) {
            Ok(v) => stringify(&v),
            Err(e) => format!("ERR:{}", e),
        };
        LAST_RESULT = out.into_bytes();
        LAST_RESULT.len()
    }

    #[no_mangle]
    pub extern "C" fn parser_result_ptr() -> *const u8 {
        unsafe { LAST_RESULT.as_ptr() }
    }
}`;

// Forwarded captures + Rust types for an alt-tail's function signature
// when prefix-share factoring is in effect. The order is the order of named
// spans within the shared prefix — every alt tail receives the same list,
// so the dispatcher's call site can pass positional arguments without
// per-alt remapping. Span-name → Rust parameter type, derived from the
// span's class / modifiers (same shape the non-tail-mode emit would have
// bound as a local).
type PrefixCaptureParam = { readonly name: string; readonly ty: string };
type PrefixCaptures = {
  readonly skipCount: number;
  readonly params: ReadonlyArray<PrefixCaptureParam>;
};

function prefixCaptureParams(info: NodeTypeInfo, share: PrefixShare): PrefixCaptures | null {
  // The Rust backend doesn't emit a binding for a NAMED PURE-LITERAL span
  // (no recursive roles, class === 'literal') — emitSpan's literal arm just
  // matches the text and binds `__<name>_start`, never `<name>` itself.
  // detectPrefixShare can match a prefix that includes such a span; if it
  // does, the alt tail would receive a typed parameter with no
  // corresponding caller-side binding. Conservatively bail. Recursive spans
  // (.of() with or without .repeats()) commonly carry class === 'literal'
  // because span(name, exampleText) defaults the class to literal — those
  // are fine because emitSpan dispatches on recursiveRoles, not on class,
  // and produces a real local binding.
  const prefixProd = info.productions[0]!;
  const params: PrefixCaptureParam[] = [];
  for (let i = 0; i < share.prefixLen; i++) {
    const s = prefixProd.spans[i]!;
    if (!s.name) continue;
    if (s.class === 'literal' && s.recursiveRoles.length === 0) return null;
    params.push({ name: s.name, ty: rustCaptureType(s) });
  }
  return { skipCount: share.prefixLen, params };
}

// The Rust type the dispatcher binds locally for a prefix span (and that
// each alt tail receives by value as a parameter). Mirrors emitSpan's local
// binding for the same span: class spans get `String`, .repeats() spans
// get `Vec<Value>`, recursive spans get `Value`, with `Option<...>` for
// optional variants.
function rustCaptureType(span: ResolvedSpan): string {
  const isOptional = span.modifiers.some((m) => m.kind === 'optional');
  const isRepeats = span.modifiers.some((m) => m.kind === 'repeats');
  const isRecursive = span.recursiveRoles.length > 0;
  if (isRepeats) return 'Vec<Value>';
  if (isRecursive) return isOptional ? 'Option<Value>' : 'Value';
  return isOptional ? 'Option<String>' : 'String';
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

function emitProductionFn(
  schema: InferredSchema,
  production: Production,
  altIdx: number,
  prefixCaps: PrefixCaptures | null,
): string {
  const fnName = `parse_${rustIdent(production.nodeType)}__alt${altIdx}`;
  const lines: string[] = [];
  if (prefixCaps !== null) {
    // Tail-mode signature: dispatcher passes its `entry_pos` rewind boundary
    // plus every prefix capture by value. The captures are typed by their
    // span shape so the render body references them with the same syntax
    // the non-tail-mode emit would have produced for the same name.
    const paramList = [
      `state: &mut State`,
      `entry_pos: usize`,
      ...prefixCaps.params.map((p) => `${rustIdent(p.name)}: ${p.ty}`),
    ];
    lines.push(`fn ${fnName}(${paramList.join(', ')}) -> Option<Value> {`);
  } else {
    lines.push(`fn ${fnName}(state: &mut State) -> Option<Value> {`);
    lines.push(`    let entry_pos = state.pos;`);
  }

  const startIdx = prefixCaps ? prefixCaps.skipCount : 0;
  for (let i = startIdx; i < production.spans.length; i++) {
    const span = production.spans[i]!;
    // `if (i > 0)` includes the case i === skipCount in tail mode — the
    // dispatcher leaves state.pos at the post-prefix position WITHOUT
    // consuming the inter-span ws into the suffix, so the alt tail still
    // needs to skip ws before its first own span. Matches the TS-backend
    // emit/v2/production.ts loop shape.
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

// Phase 6.5 follow-up #1 — Rust prefix-share dispatcher.
//
// Mirror of emit/v2/prefix-share-dispatch.ts::emitPrefixShareDispatcher,
// reshaped for Rust's ownership model and the local byte-slice API:
//
//   1. skip_ws at entry — matches every other parse_NodeType entry.
//   2. Inline-parse the shared prefix spans via emitSpan. This binds locals
//      with the SAME names the alt tails declare as parameters (e.g.
//      `columns: Vec<Value>`, `table: String`), so the alt-tail call sites
//      can forward them positionally.
//   3. Snapshot post-prefix state.pos into `__post_pos` and ws-skip-peek
//      the next byte position without committing.
//   4. For each distinct suffix-head literal (longer first when heads tie
//      in starting byte), branch on `state.input[__peek..].starts_with(...)`
//      and probe each alt with that head — longest-suffix alt first within
//      a group (matches the speculation order in dispatch.ts).
//   5. Fall through to the empty-suffix alt (at most one) by value-move; the
//      preceding probes clone() each capture so the move-on-fallthrough is
//      well-typed. When no empty alt exists, rewind to entry_pos and return
//      None.
//
// Ownership note: each prefix capture is forwarded BY VALUE (not by
// reference) so the alt body emits unchanged — `Value::String(table.clone())`
// in the render body works whether `table` was a local or a parameter.
// The dispatcher clones each capture for non-final probes; the final
// fallthrough moves the originals.
function emitPrefixShareDispatcherRust(
  schema: InferredSchema,
  info: NodeTypeInfo,
  share: PrefixShare,
  caps: PrefixCaptures,
): string {
  const fnName = `parse_${rustIdent(info.name)}`;
  const prefixProd = info.productions[0]!;
  const lines: string[] = [];
  lines.push(`fn ${fnName}(state: &mut State) -> Option<Value> {`);
  lines.push(`    let entry_pos = state.pos;`);
  lines.push(`    skip_ws(state);`);

  // Emit each prefix span using the standard emitter. emitSpan reads
  // `entry_pos` from the enclosing scope for its failure-rewind paths;
  // since we declared it as a local above, those paths return None from
  // this dispatcher — the correct propagation for "this node didn't
  // match anywhere".
  for (let i = 0; i < share.prefixLen; i++) {
    const span = prefixProd.spans[i]!;
    if (i > 0) lines.push(`    skip_ws(state);`);
    emitSpan(lines, span, schema);
  }

  lines.push(`    let __post_pos = state.pos;`);
  // Read-only ws-skip-peek. We're looking for the first non-ws byte after
  // the prefix; each branch tests startsWith against its suffix-head
  // literal from that position.
  lines.push(`    let mut __peek = state.pos;`);
  lines.push(`    while __peek < state.input.len() {`);
  lines.push(`        let b = state.input[__peek];`);
  lines.push(`        if b == b' ' || b == b'\\t' || b == b'\\n' || b == b'\\r' { __peek += 1; continue; }`);
  lines.push(`        break;`);
  lines.push(`    }`);

  // Group alts by suffix head (longest-suffix first within a group, like
  // dispatch.ts's speculation order). Empty-suffix alt is the fallthrough.
  const byHead = new Map<string, number[]>();
  let emptyAltIdx: number | null = null;
  for (const { altIdx, head } of share.suffixHeads) {
    if (head === null) { emptyAltIdx = altIdx; continue; }
    let bucket = byHead.get(head);
    if (!bucket) { bucket = []; byHead.set(head, bucket); }
    bucket.push(altIdx);
  }
  for (const bucket of byHead.values()) {
    bucket.sort((a, b) => info.productions[b]!.spans.length - info.productions[a]!.spans.length);
  }
  // Emit longer heads first so e.g. "LIMITED" wins over "LIMIT". Within
  // equal-length heads, Map insertion order is stable.
  const headEntries = [...byHead.entries()].sort((a, b) => b[0].length - a[0].length);

  // Forward args: every probe + the fallthrough need to pass entry_pos
  // and the prefix captures. Probes clone() so the dispatcher retains
  // ownership for the fallthrough.
  const cloneArgs = ['state', 'entry_pos', ...caps.params.map((p) => `${rustIdent(p.name)}.clone()`)];
  const moveArgs = ['state', 'entry_pos', ...caps.params.map((p) => rustIdent(p.name))];

  for (const [head, altIdxs] of headEntries) {
    const headBytes = `b${rustString(head)}`;
    lines.push(`    if __peek <= state.input.len() && state.input[__peek..].starts_with(${headBytes}) {`);
    for (const idx of altIdxs) {
      const callFn = `parse_${rustIdent(info.name)}__alt${idx}`;
      lines.push(`        state.pos = __post_pos;`);
      lines.push(`        if let Some(v) = ${callFn}(${cloneArgs.join(', ')}) { return Some(v); }`);
    }
    lines.push(`    }`);
  }

  if (emptyAltIdx !== null) {
    const callFn = `parse_${rustIdent(info.name)}__alt${emptyAltIdx}`;
    lines.push(`    state.pos = __post_pos;`);
    lines.push(`    ${callFn}(${moveArgs.join(', ')})`);
  } else {
    lines.push(`    state.pos = entry_pos;`);
    lines.push(`    None`);
  }

  lines.push(`}`);
  return lines.join('\n');
}

function emitNodeTypeDispatcher(nodeType: string, productions: ReadonlyArray<Production>): string {
  const fn = `parse_${rustIdent(nodeType)}`;
  const lines: string[] = [];
  lines.push(`fn ${fn}(state: &mut State) -> Option<Value> {`);
  const order = computeAltDispatchOrder(productions);
  for (const i of order) {
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

// Phase 6.5 follow-up — alt try-order within the speculation chain. Mirror
// of the TS-backend rule in emit/v2/dispatch.ts::emitGroupSpeculation:
// alts that share a first-token signature get sorted by span count
// descending so the most-committed alt is tried first; otherwise the
// declared order is preserved.
//
// Motivating cases:
//   - iso-duration.Duration: alt0 = [P, date.repeats(min=1)], alt1 = [P,
//     date.repeats(min=0), T, time.repeats(min=1)]. Both start with the
//     literal P; the prefix-share factoring bails because the date span's
//     `.repeats(min)` modifier differs across alts (strict equality). The
//     legacy declared-order chain commits to alt0 on inputs like
//     `P1Y2M3DT4H5M6S`, leaves state.pos at byte 7 (the T), and the
//     top-level EOF check rejects.
//   - cron.CronField: alt0 = [`*`], alt1 = [`*`, `/`, step], alt2 = [N],
//     alt3 = [N, `-`, N]. The wildcard alts share first-byte `*`; the
//     number alts share the digit-start predicate. Declared-order
//     dispatch commits to the 1-span alt before the 3-span alt for the
//     `*/5` and `1-5` inputs.
//
// Grouping key: literal first-bytes share a key; class-starting first
// spans share a per-class key. Spans with first-position modifiers
// (.optional / .until / .repeats) or recursive roles are non-comparable
// — they get unique keys and stay in declared order.
function computeAltDispatchOrder(productions: ReadonlyArray<Production>): number[] {
  type Meta = { idx: number; key: string; spanCount: number };
  const meta: Meta[] = productions.map((p, idx) => ({
    idx,
    key: firstTokenGroupKey(p, idx),
    spanCount: p.spans.length,
  }));
  // Group by key, preserving the order in which each key first appears.
  const groupOrder: string[] = [];
  const groups = new Map<string, Meta[]>();
  for (const m of meta) {
    let g = groups.get(m.key);
    if (!g) { g = []; groups.set(m.key, g); groupOrder.push(m.key); }
    g.push(m);
  }
  // Within each group, descending span count, stable on declared order.
  for (const g of groups.values()) {
    g.sort((a, b) => (b.spanCount !== a.spanCount ? b.spanCount - a.spanCount : a.idx - b.idx));
  }
  // Rebuild the global order by walking the original declared order and
  // substituting each alt with the next member of its sorted group. That
  // keeps groups interleaved at the positions their first members declared,
  // rather than collapsing all groups to the head/tail.
  const consumed = new Map<string, number>();
  const order: number[] = [];
  for (const m of meta) {
    const g = groups.get(m.key)!;
    const k = consumed.get(m.key) ?? 0;
    order.push(g[k]!.idx);
    consumed.set(m.key, k + 1);
  }
  return order;
}

function firstTokenGroupKey(prod: Production, declaredIdx: number): string {
  const s0 = prod.spans[0];
  if (!s0) return `empty:${declaredIdx}`;
  // First-position modifiers or recursive role: non-comparable. Give each
  // such alt its own group so it stays in declared order relative to other
  // alts (the per-group sort never moves a singleton).
  const hasFirstPosMod =
    s0.modifiers.some((m) => m.kind === 'optional' || m.kind === 'until' || m.kind === 'repeats' || m.kind === 'rawUntil');
  if (hasFirstPosMod) return `nc:${declaredIdx}`;
  if (s0.recursiveRoles.length > 0) return `nc:${declaredIdx}`;
  if (s0.class === 'literal') {
    if (s0.text === undefined || s0.text.length === 0) return `nc:${declaredIdx}`;
    return `lit:${s0.text.charCodeAt(0)}`;
  }
  // Class-starting span: key by class + first-refinement signature so
  // (e.g.) `.number()` and `.number().int()` group together (their digit-
  // start predicates are identical for grouping purposes).
  return `cls:${s0.class}`;
}

// ---------------------------------------------------------------------------
// Phase 6.4 — stringify (inverse path).
//
// For each production we emit a `stringify_<NodeType>__alt<idx>(value) ->
// Option<String>` function. It:
//   1. Discriminates against the render body's shape (literal `type:`
//      field is the common discriminator).
//   2. Walks the spans in declaration order, emitting each:
//        - literal span        → its constant text
//        - named class span    → captured String from the value's
//                                 corresponding field
//        - recursive span      → stringify_<Role>(value's field)
//        - .repeats recursive  → join children with the declared sep
//        - .optional           → omit when null/missing
//   3. Inserts a single space between spans (whitespace: 'standard'). The
//      contract is value-stable, not byte-stable — same guarantee as the
//      TS backend's stringify.
//
// Productions whose render body can't be discriminated structurally (e.g.
// transparent passthroughs, dynKey, merge) return null from this function
// and are skipped by the dispatcher — the outer dispatcher then tries
// the next alt.
// ---------------------------------------------------------------------------

function emitStringifyAltFn(
  schema: InferredSchema,
  production: Production,
  altIdx: number,
  siblingBodies: ReadonlyArray<RenderBody | undefined>,
  myIdx: number,
): string | null {
  const renderBody = pickRenderBody(production);
  if (renderBody === undefined) return null;
  const fnName = `stringify_${rustIdent(production.nodeType)}__alt${altIdx}`;
  // Scalar-body production — `ast: '<lit>'` (litEnum: Operator, FreqValue,
  // …), `ast: true / false / 42`, `ast: null`. The stringify dispatcher
  // emits a wrapper that calls every __altN; without a function here the
  // binary fails to link. The fix: check the value equals the scalar
  // discriminant; on match emit the production's source (the spans
  // concatenated verbatim).
  if (renderBody === null || typeof renderBody === 'string' || typeof renderBody === 'boolean' || typeof renderBody === 'number') {
    return emitScalarStringifyAlt(fnName, renderBody, production);
  }
  if (typeof renderBody !== 'object') return null;
  if (Array.isArray(renderBody)) return null;
  if (isStructureRef(renderBody)) {
    // `ast: $.value` — the production's ast IS the named span's captured
    // value. Stringify returns that captured string (or its render via the
    // role dispatcher when recursive).
    return emitRefStringifyAlt(fnName, renderBody, production);
  }
  if (isTemplate(renderBody)) {
    // Template bodies remain out of scope for Phase 6.4.
    return null;
  }
  const obj = renderBody as Record<string, RenderBody>;
  // Build every applicable discriminator for this alt: scalar-equality on
  // each literal field, plus must-be-absent on every field that some
  // sibling alt declares but this one does not. Closes the alt-over-match
  // class of stringify mismatches surfaced by rust-diff:
  //   - toml.Value: alt1 (`{type:'boolean', value:true}`) and alt2
  //     (`{type:'boolean', value:false}`) both have `type === 'boolean'`;
  //     the original single-`type`-check let alt1 swallow false-valued
  //     inputs and emit "true". Boolean-equality on `value` separates them.
  //   - iso-duration.Duration: alt0 has fields {type, date}; alt1 adds
  //     `time`. Old discrim let alt0 match time-bearing inputs and emit
  //     just `P + date`. Must-be-absent on `time` for alt0 forces routing
  //     to alt1.
  //   - pg-select.Select: the four `{type:'select', ...}` alts differ only
  //     in which of {where, limit} they declare. Each alt rejects values
  //     containing fields outside its declared set.
  const discrimLines = buildDiscriminatorChecks(obj, siblingBodies, myIdx);

  // Prefer the inverse direction: when the production declares a source
  // template (e.g. `source: tpl\`${$.key} = ${$.value}\``), drive the emit
  // straight off its `parts` + `slots`. That preserves the EXACT inter-slot
  // whitespace the schema author wrote — the heuristic fallback below
  // either drops or inserts spaces that don't match (Phase 6.5 surfaced this
  // for toml `key= value`, pg-select `SELECT *FROM`, rrule `FREQ= DAILY`).
  const sourceTpl = findSourceTemplate(production);
  if (sourceTpl !== null) {
    return emitTemplateStringifyBody(fnName, obj, production, sourceTpl, discrimLines);
  }

  const lines: string[] = [];
  lines.push(`fn ${fnName}(value: &Value) -> Option<String> {`);
  for (const dl of discrimLines) lines.push(`    ${dl}`);
  // Extract each named-span capture as a local binding.
  const extracted = new Set<string>();
  for (const span of production.spans) {
    if (!span.name) continue;
    if (extracted.has(span.name)) continue;
    extracted.add(span.name);
    const fieldKey = findFieldForCapture(obj, span.name);
    if (fieldKey === null) continue;
    const v = rustIdent(span.name);
    lines.push(`    let ${v} = value.obj_get(${rustString(fieldKey)});`);
  }
  lines.push(`    let mut __out = String::new();`);
  let firstEmit = true;
  for (const span of production.spans) {
    const piece = emitStringifyForSpan(span);
    if (piece === null) {
      // Optional unnamed span with no presence info — skip emission
      // entirely so we don't insert spurious text.
      continue;
    }
    if (!firstEmit && piece.needsSpaceBefore) {
      lines.push(`    if !__out.is_empty() && !__out.ends_with(' ') { __out.push(' '); }`);
    }
    for (const line of piece.lines) lines.push(`    ${line}`);
    firstEmit = false;
  }
  lines.push(`    Some(__out)`);
  lines.push(`}`);
  return lines.join('\n');
}

function findSourceTemplate(production: Production): import('@parser2/parser').Template | null {
  // The same production may declare several render targets (cron has both
  // ast and source). We want whichever target's body IS a Template so the
  // inverse stringify can replay the author's literal text verbatim.
  for (const entry of production.renders.values()) {
    if (isTemplate(entry.body)) return entry.body;
  }
  return null;
}

function emitTemplateStringifyBody(
  fnName: string,
  astBody: Record<string, RenderBody>,
  production: Production,
  tpl: import('@parser2/parser').Template,
  discrimLines: ReadonlyArray<string>,
): string {
  const lines: string[] = [];
  lines.push(`fn ${fnName}(value: &Value) -> Option<String> {`);
  for (const dl of discrimLines) lines.push(`    ${dl}`);
  // Bind every slot's ast field once. Slots may reuse the same capture; only
  // emit the local once per unique name.
  const bound = new Set<string>();
  for (const slot of tpl.slots) {
    if (slot.kind !== 'capture') continue;
    if (bound.has(slot.ref)) continue;
    bound.add(slot.ref);
    const fieldKey = findFieldForCapture(astBody, slot.ref);
    // No corresponding ast field — fall back to None below (stringify will
    // silently skip the slot, matching the TS backend's `?? ''` pattern for
    // unused refs).
    const v = rustIdent(slot.ref);
    if (fieldKey === null) {
      lines.push(`    let ${v}: Option<&Value> = None;`);
    } else {
      lines.push(`    let ${v} = value.obj_get(${rustString(fieldKey)});`);
    }
  }
  // Materialize each slot into a positional String local (`__s0`, `__s1`,
  // …). Doing this BEFORE the walk lets the inter-slot literal `parts[i]`
  // gate on `!__sj.is_empty()` for the slots in its tail — fixes the
  // trailing-empty-slot bug (cron `${...} ${cmd}` produced "... " when
  // cmd was null because parts[5] was pushed before slot[5] without
  // checking that anything would follow).
  for (let i = 0; i < tpl.slots.length; i++) {
    const slot = tpl.slots[i]!;
    const span = slot.kind === 'capture'
      ? production.spans.find((s) => s.name === slot.ref)
      : undefined;
    const expr = slot.kind === 'capture' && span !== undefined
      ? buildSlotExpr(span, slot.ref)
      : 'String::new()';
    lines.push(`    let __s${i}: String = ${expr};`);
  }
  lines.push(`    let mut __out = String::new();`);
  // Walk parts[0], slot[0], parts[1], slot[1], … parts[last]. parts[i]
  // for i >= 1 is gated when its tail (slots[i..] + parts[i+1..]) might
  // be entirely empty at runtime.
  for (let i = 0; i < tpl.parts.length; i++) {
    const part = tpl.parts[i]!;
    if (part) {
      const gate = i === 0 ? null : computeTailPresenceGate(tpl, i, production);
      if (gate === null) {
        // Statically required (leading part OR some required slot / non-
        // empty literal in the tail) — always emit.
        lines.push(`    __out.push_str(${rustString(part)});`);
      } else if (gate === 'never') {
        // Statically empty tail — skip the literal entirely.
      } else {
        lines.push(`    if ${gate} { __out.push_str(${rustString(part)}); }`);
      }
    }
    if (i < tpl.slots.length) {
      lines.push(`    __out.push_str(&__s${i});`);
    }
  }
  lines.push(`    Some(__out)`);
  lines.push(`}`);
  return lines.join('\n');
}

// Expression form of the emitTemplateSlot logic — returns a Rust
// EXPRESSION (no semicolons, no __out.push_str) that evaluates to the
// String contribution of one template slot. Used by
// emitTemplateStringifyBody to pre-materialize each slot into a `__sN`
// local so subsequent inter-slot literal gating can ask `__sN.is_empty()`.
function buildSlotExpr(span: ResolvedSpan, captureName: string): string {
  const v = rustIdent(captureName);
  const isOptional = span.modifiers.some((m) => m.kind === 'optional');
  const repeatsMod = span.modifiers.find((m) => m.kind === 'repeats');
  const isRecursive = span.recursiveRoles.length > 0;

  if (repeatsMod !== undefined) {
    const sep = (repeatsMod as RepeatsModifier).sep ?? ' ';
    const role = isRecursive ? rustIdent(span.recursiveRoles[0]!) : null;
    const inner = role === null
      ? `if let Value::String(s) = item { __t.push_str(s); }`
      : `__t.push_str(&stringify_${role}(item));`;
    return `if let Some(Value::Array(items)) = ${v} { ` +
      `let mut __t = String::new(); ` +
      `for (i, item) in items.iter().enumerate() { ` +
      `if i > 0 { __t.push_str(${rustString(sep)}); } ${inner} ` +
      `} __t ` +
      `} else { String::new() }`;
  }
  if (isRecursive) {
    const role = rustIdent(span.recursiveRoles[0]!);
    if (isOptional) {
      return `if let Some(inner) = ${v} { ` +
        `if !matches!(inner, Value::Null) { stringify_${role}(inner) } else { String::new() } ` +
        `} else { String::new() }`;
    }
    return `if let Some(inner) = ${v} { stringify_${role}(inner) } else { String::new() }`;
  }
  // Class capture (string-valued in the ast). Optional and required share
  // the same expression — Option<&Value> + matching pattern handles both.
  return `if let Some(Value::String(s)) = ${v} { s.clone() } else { String::new() }`;
}

// Compute the Rust expression that must be true for parts[i] to be
// emitted, where i in [1, parts.length-1] (parts[0] is the leading
// literal — handled unconditionally by the caller).
//
// Two roles for non-leading parts:
//   - INTER-SLOT (1 <= i < slots.length): parts[i] is the bridge between
//     slot[i-1] and slot[i]. Its presence depends on whether content
//     FOLLOWS it — gate on slot[i] producing output. (cron's ' '
//     between dow and the optional cmd: when cmd is empty, the trailing
//     space is orphan and must be skipped.)
//   - TRAILING (i === slots.length): parts[i] is the literal AFTER the
//     last slot. It anchors to slot[i-1] (the preceding slot) — when
//     the slot is empty the trailing literal is orphan. (iso-duration's
//     `${value}Y` template: parts[1] = 'Y' anchors to slot[0]=value;
//     value is required so Y always emits.)
//
// In both cases the "anchor" slot is checked: required → always emit
// (return null); optional → runtime gate on `!__sN.is_empty()`. The
// 'never' branch returns when the anchor slot is optional and also has
// a downstream gate that's statically false (rare; bail safely).
function computeTailPresenceGate(
  tpl: import('@parser2/parser').Template,
  i: number,
  production: Production,
): string | null | 'never' {
  // Pick the slot this literal anchors to.
  const anchorIdx = i < tpl.slots.length ? i : tpl.slots.length - 1;
  if (anchorIdx < 0 || anchorIdx >= tpl.slots.length) return null;
  const slot = tpl.slots[anchorIdx]!;
  if (slot.kind !== 'capture') return null; // unknown shape — emit defensively
  const span = production.spans.find((s) => s.name === slot.ref);
  if (!span) return null;
  const isOptional = span.modifiers.some((m) => m.kind === 'optional');
  const repeatsMod = span.modifiers.find((m) => m.kind === 'repeats');
  const minRepeats = repeatsMod ? ((repeatsMod as RepeatsModifier).min ?? 0) : null;
  const isRepeatsMin0 = repeatsMod !== undefined && minRepeats === 0;
  // For inter-slot parts: we ALSO need to consider whether a required
  // slot deeper in the tail (slots[i+1..]) anchors the literal. If
  // slot[i] is optional but slot[i+1] is required, the literal still
  // bridges into required content and should always emit. Quick scan.
  if (isOptional || isRepeatsMin0) {
    for (let j = anchorIdx + 1; j < tpl.slots.length; j++) {
      const s = tpl.slots[j]!;
      if (s.kind !== 'capture') return null;
      const sp = production.spans.find((x) => x.name === s.ref);
      if (!sp) continue;
      const opt = sp.modifiers.some((m) => m.kind === 'optional');
      const rep = sp.modifiers.find((m) => m.kind === 'repeats');
      const repMin0 = rep !== undefined && ((rep as RepeatsModifier).min ?? 0) === 0;
      if (!opt && !repMin0) return null; // downstream required slot — always emit
    }
    return `!__s${anchorIdx}.is_empty()`;
  }
  return null; // anchor slot is required — always emit
}

/** Stringify a production whose `ast` body is a scalar (string, boolean,
 *  number) — the litEnum shape (`...litEnum('Operator', ['!=', '<=', …])`)
 *  and bare-literal alts (`relation('X', { encodings: { ast: true, ... } })`).
 *
 *  Strategy: gate on the value matching the scalar; on match, emit the
 *  production's spans verbatim (each unnamed literal contributes its text;
 *  named spans aren't possible here by definition — a scalar body has no
 *  captures to inject). The vast majority of these productions are a single
 *  literal span (the keyword being matched).
 */
function emitScalarStringifyAlt(
  fnName: string,
  body: string | boolean | number | null,
  production: Production,
): string {
  const lines: string[] = [];
  lines.push(`fn ${fnName}(value: &Value) -> Option<String> {`);
  if (body === null) {
    lines.push(`    if !matches!(value, Value::Null) { return None; }`);
  } else if (typeof body === 'boolean') {
    lines.push(`    if let Value::Bool(b) = value { if *b != ${body} { return None; } } else { return None; }`);
  } else if (typeof body === 'number') {
    lines.push(`    if let Value::Number(n) = value { if *n != ${body}_f64 { return None; } } else { return None; }`);
  } else {
    lines.push(`    if let Value::String(s) = value { if s != ${rustString(body)} { return None; } } else { return None; }`);
  }
  lines.push(`    let mut __out = String::new();`);
  for (const span of production.spans) {
    if (span.class === 'literal' && span.text !== undefined) {
      lines.push(`    __out.push_str(${rustString(span.text)});`);
    }
  }
  lines.push(`    Some(__out)`);
  lines.push(`}`);
  return lines.join('\n');
}

/** Stringify a production whose `ast` body is a bare `$.<span>` reference
 *  — `relation('CommandWord', { ast: $.value, source: tpl\`${$.value}\` })`.
 *  The ast value IS the named span's captured value, so stringify takes the
 *  value directly:
 *   - For a class-capturing span (ident/number/…), the captured value is a
 *     string → output it verbatim.
 *   - For a recursive span, dispatch through that role's stringify.
 */
function emitRefStringifyAlt(
  fnName: string,
  body: StructureRef,
  production: Production,
): string {
  const lines: string[] = [];
  lines.push(`fn ${fnName}(value: &Value) -> Option<String> {`);
  if (body.__ref !== 'span-value') {
    // span-presence / synthetic refs as bare ast aren't a real schema shape;
    // bail conservatively rather than emit code that won't compile.
    lines.push(`    None`);
    lines.push(`}`);
    return lines.join('\n');
  }
  const span = production.spans.find((s) => s.name === body.name);
  if (!span) {
    lines.push(`    None`);
    lines.push(`}`);
    return lines.join('\n');
  }
  if (span.recursiveRoles.length === 1) {
    const role = rustIdent(span.recursiveRoles[0]!);
    lines.push(`    Some(stringify_${role}(value))`);
  } else if (span.recursiveRoles.length > 1) {
    // Multi-role: fall back to the first role's stringify alt0 as a best-
    // effort — the schema author can always extend this later.
    const role = rustIdent(span.recursiveRoles[0]!);
    lines.push(`    Some(stringify_${role}(value))`);
  } else {
    // Class capture: value must be a String. Output it verbatim.
    lines.push(`    if let Value::String(s) = value { Some(s.clone()) } else { None }`);
  }
  lines.push(`}`);
  return lines.join('\n');
}

type StringifyPiece = { readonly lines: ReadonlyArray<string>; readonly needsSpaceBefore: boolean };

function emitStringifyForSpan(span: ResolvedSpan): StringifyPiece | null {
  const isOptional = span.modifiers.some((m) => m.kind === 'optional');
  const repeatsMod = span.modifiers.find((m) => m.kind === 'repeats');
  const isRecursive = span.recursiveRoles.length > 0;
  const v = span.name ? rustIdent(span.name) : null;
  // Unnamed literal: emit verbatim.
  if (!span.name && span.class === 'literal') {
    if (span.text === undefined) return { lines: [], needsSpaceBefore: false };
    return {
      lines: [`__out.push_str(${rustString(span.text)});`],
      needsSpaceBefore: false,
    };
  }
  if (repeatsMod !== undefined && v !== null) {
    const sep = (repeatsMod as RepeatsModifier).sep ?? ' ';
    const roles = span.recursiveRoles;
    if (roles.length === 0) {
      return { lines: [`/* unsupported: repeats on non-recursive */`], needsSpaceBefore: false };
    }
    const dispatcher = roles.length === 1
      ? `stringify_${rustIdent(roles[0]!)}(item)`
      : `(${roles.map((r) => `stringify_${rustIdent(r)}__alt0(item).unwrap_or_default()`).join(' + &')})`;
    const lines = [
      `if let Some(Value::Array(items)) = ${v} {`,
      `    for (i, item) in items.iter().enumerate() {`,
      `        if i > 0 { __out.push_str(${rustString(sep)}); }`,
      `        __out.push_str(&${dispatcher});`,
      `    }`,
      `}`,
    ];
    return { lines, needsSpaceBefore: true };
  }
  if (isRecursive && v !== null) {
    const role = span.recursiveRoles[0]!;
    const stringifier = `stringify_${rustIdent(role)}`;
    if (isOptional) {
      return {
        lines: [
          `if let Some(inner) = ${v} {`,
          `    if !matches!(inner, Value::Null) { __out.push_str(&${stringifier}(inner)); }`,
          `}`,
        ],
        needsSpaceBefore: true,
      };
    }
    return {
      lines: [`if let Some(inner) = ${v} { __out.push_str(&${stringifier}(inner)); }`],
      needsSpaceBefore: true,
    };
  }
  // Class span (string-valued capture).
  if (span.class !== 'literal' && v !== null) {
    if (isOptional) {
      return {
        lines: [
          `if let Some(Value::String(s)) = ${v} { __out.push_str(s); }`,
        ],
        needsSpaceBefore: true,
      };
    }
    return {
      lines: [`if let Some(Value::String(s)) = ${v} { __out.push_str(s); }`],
      needsSpaceBefore: true,
    };
  }
  // Named literal: same as unnamed literal — emit its text.
  if (span.class === 'literal' && span.text !== undefined) {
    return { lines: [`__out.push_str(${rustString(span.text)});`], needsSpaceBefore: false };
  }
  return null;
}

function pickDiscriminator(obj: Record<string, RenderBody>): { field: string; value: string } | null {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') return { field: k, value: v };
  }
  return null;
}

// Phase 6.5 follow-up — build every discriminator check the alt's body
// implies, as Rust source lines. Two flavours, both emitted as `match`
// arms returning None on mismatch:
//
//   1. EQUALITY: every top-level scalar (string / boolean / number / null)
//      field declared by this alt. Mandatory match — `match` on `obj_get`
//      returning that scalar with a guard.
//
//   2. ABSENCE: every field name that appears in some sibling alt's body
//      but NOT in this alt's body. Mandatory absent / null. Without this,
//      a 4-alt node like pg-select.Select whose alts differ only in which
//      of {where, limit} they declare would have its first alt match any
//      `{type:'select', …}` ast — the alts would never get the chance to
//      decide based on field presence.
//
// Ref-valued fields (StructureRef payloads) and nested object / array /
// template fields are deliberately NOT discriminators: those are slots
// the parse fills in, and their presence is what the absence check on
// siblings reads. The discriminator stays at the top-level scalar layer.
function buildDiscriminatorChecks(
  altBody: Record<string, RenderBody>,
  siblingBodies: ReadonlyArray<RenderBody | undefined>,
  myIdx: number,
): string[] {
  const lines: string[] = [];

  // 1. Per-field scalar equality.
  for (const [k, v] of Object.entries(altBody)) {
    const key = rustString(k);
    if (typeof v === 'string') {
      lines.push(
        `match value.obj_get(${key}) { Some(Value::String(s)) if s == ${rustString(v)} => (), _ => return None }`,
      );
    } else if (typeof v === 'boolean') {
      lines.push(
        `match value.obj_get(${key}) { Some(Value::Bool(b)) if *b == ${v} => (), _ => return None }`,
      );
    } else if (typeof v === 'number') {
      lines.push(
        `match value.obj_get(${key}) { Some(Value::Number(n)) if *n == ${v}_f64 => (), _ => return None }`,
      );
    } else if (v === null) {
      lines.push(
        `match value.obj_get(${key}) { None | Some(Value::Null) => (), _ => return None }`,
      );
    }
    // Refs / nested objects / arrays / templates: not scalar discrim, skip.
  }

  // 2. Absence checks. Collect every field name some other alt declares
  // that this alt does NOT, then assert it's absent or null at runtime.
  const myFields = new Set(Object.keys(altBody));
  const mustBeAbsent = new Set<string>();
  for (let i = 0; i < siblingBodies.length; i++) {
    if (i === myIdx) continue;
    const sib = siblingBodies[i];
    if (sib === undefined || sib === null || typeof sib !== 'object') continue;
    if (Array.isArray(sib)) continue;
    if (isStructureRef(sib)) continue;
    if (isTemplate(sib)) continue;
    for (const k of Object.keys(sib as Record<string, RenderBody>)) {
      if (!myFields.has(k)) mustBeAbsent.add(k);
    }
  }
  for (const k of mustBeAbsent) {
    lines.push(
      `match value.obj_get(${rustString(k)}) { None | Some(Value::Null) => (), _ => return None }`,
    );
  }
  return lines;
}

function findFieldForCapture(obj: Record<string, RenderBody>, captureName: string): string | null {
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object' && isStructureRef(v) && v.__ref === 'span-value' && v.name === captureName) {
      return k;
    }
  }
  return null;
}

function emitStringifyDispatcher(nodeType: string, altCount: number): string {
  const fn = `stringify_${rustIdent(nodeType)}`;
  const lines: string[] = [];
  lines.push(`fn ${fn}(value: &Value) -> String {`);
  for (let i = 0; i < altCount; i++) {
    lines.push(`    if let Some(out) = stringify_${rustIdent(nodeType)}__alt${i}(value) { return out; }`);
  }
  lines.push(`    String::new()`);
  lines.push(`}`);
  return lines.join('\n');
}

function emitStringifyEntry(schema: InferredSchema): string {
  const root = rustIdent(schema.rootType);
  return `pub fn stringify(value: &Value) -> String {
    stringify_${root}(value)
}`;
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

// Reserved Rust 2021 edition keywords that would shadow as ordinary
// identifiers. Schema authors freely pick capture names like `where`,
// `type`, `match`, etc. — those need raw-identifier escaping in the emit
// (`r#where`). Subset list: only keywords that can legitimately appear as
// span/field names; struct/path-only keywords like `mod` or `crate` are
// included defensively since they cost nothing to escape.
const RUST_RESERVED: ReadonlySet<string> = new Set([
  'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern',
  'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod',
  'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct',
  'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
  'async', 'await', 'dyn',
  // Reserved for future use:
  'abstract', 'become', 'box', 'do', 'final', 'macro', 'override', 'priv',
  'typeof', 'unsized', 'virtual', 'yield', 'try',
]);

function rustIdent(name: string): string {
  // Rust identifier: replace illegal chars with underscores. Names are
  // already kebab-or-camel from the schema; conservatively replace anything
  // not [A-Za-z0-9_]. Reserved keywords are wrapped as raw identifiers
  // (e.g. `where` → `r#where`) so a schema span named `where`
  // (pg-select) doesn't collide with Rust syntax.
  const safe = name.replace(/[^A-Za-z0-9_]/g, '_');
  return RUST_RESERVED.has(safe) ? `r#${safe}` : safe;
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
