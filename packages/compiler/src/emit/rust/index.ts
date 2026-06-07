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
  if (span.modifiers.length > 0) {
    throw new CompilerError(
      `rust backend (Phase 6.0): span modifiers not yet supported (got [${span.modifiers.map((m) => m.kind).join(', ')}])`,
    );
  }
  if (span.recursiveRoles.length > 0) {
    throw new CompilerError(`rust backend (Phase 6.0): recursive spans not yet supported`);
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
    const startVar = `__${rustIdent(span.name ?? 'anon')}_start`;
    const endVar = `__${rustIdent(span.name ?? 'anon')}_end`;
    lines.push(
      `    let ${startVar} = state.pos;\n` +
        `    if state.pos >= state.input.len() || !is_ident_start(state.input[state.pos]) {\n` +
        `        if state.pos > state.max_pos { state.max_pos = state.pos; }\n` +
        `        state.pos = entry_pos;\n` +
        `        return None;\n` +
        `    }\n` +
        `    state.pos += 1;\n` +
        `    while state.pos < state.input.len() && is_ident_cont(state.input[state.pos]) {\n` +
        `        state.pos += 1;\n` +
        `    }\n` +
        `    let ${endVar} = state.pos;`,
    );
    if (span.name !== undefined) {
      const v = rustIdent(span.name);
      lines.push(`    let ${v}: String = state.src[${startVar}..${endVar}].to_string();`);
    }
    return;
  }
  throw new CompilerError(
    `rust backend (Phase 6.0): span class '${span.class}' not yet supported`,
  );
}

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
      assertNamedSpanExists(production, body.name);
      return `Value::String(${rustIdent(body.name)}.clone())`;
    }
    if (body.__ref === 'span-presence') {
      throw new CompilerError(
        `rust backend (Phase 6.0): $.name.present not yet supported`,
      );
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

function assertNamedSpanExists(production: Production, name: string): void {
  for (const span of production.spans) {
    if (span.name === name) return;
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
