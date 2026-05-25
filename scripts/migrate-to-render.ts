// Throwaway migration aid for Phase 6 of the unified-render-targets refactor.
// Deleted in Phase 6c once every package's schema.ts has been migrated.
//
// Two subcommands:
//
//   migrate-to-render.ts rename <schema.ts>
//     Pure text rewrite. Replaces every `.structure(...)` with
//     `.render('ast', ...)` and every `.stringify(<target>, ...)` with
//     `.render(<target>, ...)`. Preserves the original argument shape
//     exactly — only the method name (and the leading `'ast'` argument for
//     .structure) is touched. Idempotent: re-running on an already-renamed
//     file is a no-op.
//
//   migrate-to-render.ts synth-source <schema.ts> [--skip-validation]
//     Loads the (already-renamed) schema via the compiler's public
//     `inferSchema`, walks each production's spans, derives a canonical
//     `tpl\`...\`` source template (port of the deleted
//     infer/source-template.ts algorithm), and inserts a
//     `.render('source', tpl\`...\`)` call immediately before the matching
//     `.build()` on each example block. Skips entirely if ANY production
//     already declares 'source' (per-target completeness is all-or-nothing).
//
//     --skip-validation bypasses deriveInverses / inverse-discrimination
//     validation during inference. Use this when a schema has discrimination
//     issues on a different target (e.g. css-color's 'ast' ambiguity) that
//     still need the 'source' template synthesized — author will resolve
//     discrimination separately. The synth pass only needs production spans
//     and existing render targets, which attachRenderTargets alone provides.
//
// Insertion uses the example.input string as a discriminator inside the
// source: find `ex('<input>')`, scan forward to the next `.build()` at the
// same chain depth, insert the call on the line above. When the same
// example.input appears in multiple productions, the i-th derived plan
// is inserted into the i-th `ex('<input>')` occurrence in source order
// (so per-production templates land in the right chain). Schemas whose
// example inputs contain backticks would need manual handling — none of
// the v1 packages do, so we just throw.

import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const positional: string[] = [];
  const flags = new Set<string>();
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i]!;
    if (arg.startsWith('--')) flags.add(arg);
    else positional.push(arg);
  }
  const fileArg = positional[0];
  if (!cmd || !fileArg) {
    console.error('usage: migrate-to-render.ts {rename|synth-source} <schema.ts> [--skip-validation]');
    console.error('  --skip-validation  synth-source only: bypass deriveInverses / inverse');
    console.error('                     discrimination validation (use when a non-source target');
    console.error('                     has ambiguity that blocks normal inference).');
    process.exit(1);
  }
  const file = isAbsolute(fileArg) ? fileArg : resolve(process.cwd(), fileArg);
  if (cmd === 'rename') {
    runRename(file);
  } else if (cmd === 'synth-source') {
    await runSynthSource(file, { skipValidation: flags.has('--skip-validation') });
  } else {
    console.error(`unknown subcommand '${cmd}' (expected 'rename' or 'synth-source')`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// rename
// ---------------------------------------------------------------------------

function runRename(file: string): void {
  const src = readFileSync(file, 'utf8');
  let out = src;
  // .structure({ → .render('ast', {     (object body)
  // .structure(  → .render('ast',       (any non-object body, e.g. $.value)
  // The transformation is identical: a "(" follows `.structure`, and we
  // insert `'ast', ` after it. Whitespace and the balanced argument are
  // untouched.
  out = out.replace(/\.structure\(\s*/g, (m) => {
    // Preserve any inner whitespace exactly — replace `.structure(` with
    // `.render('ast', ` and re-append the consumed whitespace.
    const trailing = m.slice('.structure('.length);
    return `.render('ast', ${trailing}`;
  });
  // .stringify('json', → .render('json',
  // .stringify("json", → .render("json",
  // Don't try to touch .stringify(<non-string-literal>) — every existing
  // schema passes a string literal here.
  out = out.replace(/\.stringify\(\s*(['"][^'"]*['"])\s*,/g, (_match, lit: string) => {
    return `.render(${lit},`;
  });
  if (out === src) {
    console.log(`no changes in ${file}`);
    return;
  }
  writeFileSync(file, out);
  console.log(`rewrote ${file}`);
}

// ---------------------------------------------------------------------------
// synth-source
// ---------------------------------------------------------------------------

type Piece =
  | { readonly kind: 'literal'; readonly text: string }
  | { readonly kind: 'slot'; readonly ref: string };

type ResolvedSpan = {
  readonly name?: string;
  readonly text?: string;
  readonly class: string;
  readonly modifiers: ReadonlyArray<{ readonly kind: string; readonly min?: number }>;
  readonly recursiveRoles: ReadonlyArray<string>;
};

type Production = {
  readonly nodeType: string;
  readonly source: { readonly input: string };
  readonly spans: ReadonlyArray<ResolvedSpan>;
  readonly renders: ReadonlyMap<string, unknown>;
};

type SynthOptions = {
  readonly skipValidation: boolean;
};

async function runSynthSource(file: string, opts: SynthOptions): Promise<void> {
  // Import the schema module via the compiler so we can walk productions
  // exactly as the compiler does. When --skip-validation is set we run
  // a minimal pipeline (composition → productions → roles → validate →
  // attachRenderTargets) and SKIP deriveInverses, so schemas whose other
  // targets have discrimination ambiguity can still get a 'source'
  // template synthesized.
  const compilerRoot = resolve(file, '../../../compiler/src');
  const schemaMod = await import(pathToFileURL(file).href) as { default?: unknown };
  const schema = schemaMod.default;
  if (!isSchemaDef(schema)) {
    throw new Error(`Schema at ${file} does not default-export a SchemaDef`);
  }

  type NodeTypeInfoLike = { readonly name: string; readonly productions: ReadonlyArray<unknown> };
  let nodeTypes: ReadonlyMap<string, NodeTypeInfoLike>;
  if (opts.skipValidation) {
    const composition = await import(pathToFileURL(resolve(compilerRoot, 'infer/composition.ts')).href) as {
      resolveCompositionGraph: (root: unknown) => ReadonlyArray<unknown>;
    };
    const productions = await import(pathToFileURL(resolve(compilerRoot, 'infer/productions.ts')).href) as {
      buildProductions: (schemas: ReadonlyArray<unknown>) => ReadonlyMap<string, NodeTypeInfoLike>;
    };
    const roles = await import(pathToFileURL(resolve(compilerRoot, 'infer/roles.ts')).href) as {
      resolveRecursiveRoles: (nodeTypes: ReadonlyMap<string, NodeTypeInfoLike>, root: string) => void;
    };
    const validateMod = await import(pathToFileURL(resolve(compilerRoot, 'infer/validate.ts')).href) as {
      validate: (nodeTypes: ReadonlyMap<string, NodeTypeInfoLike>) => void;
    };
    const renderTargets = await import(pathToFileURL(resolve(compilerRoot, 'infer/render-targets.ts')).href) as {
      attachRenderTargets: (nodeTypes: ReadonlyMap<string, NodeTypeInfoLike>) => void;
    };
    const schemas = composition.resolveCompositionGraph(schema);
    nodeTypes = productions.buildProductions(schemas);
    roles.resolveRecursiveRoles(nodeTypes, (schema as { rootType: string }).rootType);
    validateMod.validate(nodeTypes);
    renderTargets.attachRenderTargets(nodeTypes);
    console.log(`synth-source: --skip-validation set; bypassing deriveInverses for ${file}`);
  } else {
    const compilerMod = await import(
      pathToFileURL(resolve(compilerRoot, 'index.ts')).href
    ) as typeof import('../packages/compiler/src/index.ts');
    const inferred = compilerMod.inferSchema(schema);
    nodeTypes = inferred.nodeTypes as ReadonlyMap<string, NodeTypeInfoLike>;
  }

  // All-or-nothing: if any production already has 'source', skip.
  for (const info of nodeTypes.values()) {
    for (const prod of info.productions) {
      if ((prod as Production).renders.has('source')) {
        console.log(`'source' target already declared on production '${info.name}#?' — skipping synth-source for ${file}`);
        return;
      }
    }
  }

  // Build per-production plans in source order. Multiple productions may
  // share the same example.input (e.g. css-length-percentage uses ex('0')
  // in several productions). We insert by ordinal match: the i-th plan
  // with a given input lands in the i-th ex('<input>') occurrence in the
  // source file.
  type Plan = {
    readonly input: string;
    readonly nodeName: string;
    readonly template: string;
  };
  const plans: Plan[] = [];
  for (const info of nodeTypes.values()) {
    for (const prod of info.productions) {
      const production = prod as Production;
      const pieces = synthesizePieces(production);
      const tplLiteral = piecesToTemplate(pieces);
      plans.push({
        input: production.source.input,
        nodeName: info.name,
        template: tplLiteral,
      });
    }
  }

  let src = readFileSync(file, 'utf8');
  let mutations = 0;
  // Track how many times we've already inserted for each (input, search-cursor)
  // — equivalent to "consume the i-th occurrence of ex(input)" in source order.
  // We use a running cursor per input so successive plans for the same input
  // skip past previously-consumed occurrences.
  const cursorByInput = new Map<string, number>();
  for (const plan of plans) {
    const startCursor = cursorByInput.get(plan.input) ?? 0;
    const exQuoted = findExCallFrom(src, plan.input, startCursor);
    if (exQuoted === null) {
      throw new Error(
        `synth-source: could not locate ex(...) for input '${truncate(plan.input)}' in ${file} (occurrence #${
          countOccurrencesUpTo(plans, plan)
        })`,
      );
    }
    const [, exEnd] = exQuoted;
    const next = insertRenderSourceCallAt(src, exEnd, plan.template);
    if (next === null) {
      throw new Error(
        `synth-source: could not locate .build() following ex('${truncate(plan.input)}') in ${file}`,
      );
    }
    // The next plan with the same input must start its search AFTER the
    // just-consumed ex() call. We resolve the source AFTER mutation, but
    // since the insertion happens at/after the .build() line — i.e. after
    // the ex() match — `exEnd` still indexes a position strictly before
    // the next occurrence in the mutated source.
    cursorByInput.set(plan.input, exEnd);
    src = next;
    // Re-locate exEnd in the mutated source for the next iteration. The
    // insertion happens at the .build() line (after exEnd) and shifts all
    // following content forward; positions at/before exEnd are unaffected,
    // so cursorByInput stays valid.
    mutations++;
  }
  src = ensureTplImport(src);
  writeFileSync(file, src);
  console.log(`inserted ${mutations} .render('source', tpl-literal) calls into ${file}`);
}

function countOccurrencesUpTo<T extends { readonly input: string }>(
  plans: ReadonlyArray<T>,
  target: T,
): number {
  let count = 0;
  for (const p of plans) {
    if (p.input === target.input) count++;
    if (p === target) return count;
  }
  return count;
}

// Ensure `tpl` is imported from '@parser2/parser'. The synthesized
// .render('source', tpl-literal) calls all reference the `tpl` tag —
// schemas that previously only used .structure(...) didn't import it.
function ensureTplImport(src: string): string {
  // Match `import { ... } from '@parser2/parser';`. Allow inner whitespace
  // and multi-line lists; we only need the brace contents.
  const importRe = /import\s*\{([^}]*)\}\s*from\s*(['"])@parser2\/parser\2\s*;?/;
  const m = importRe.exec(src);
  if (!m) return src;
  const inner = m[1]!;
  const names = inner.split(',').map((n) => n.trim()).filter((n) => n.length > 0);
  if (names.includes('tpl')) return src;
  const merged = [...names, 'tpl'].sort();
  const quote = m[2]!;
  const replacement = `import { ${merged.join(', ')} } from ${quote}@parser2/parser${quote};`;
  return src.slice(0, m.index) + replacement + src.slice(m.index + m[0].length);
}

// ---------------------------------------------------------------------------
// Source-template synthesis (port of deleted infer/source-template.ts)
// ---------------------------------------------------------------------------

function synthesizePieces(production: Production): ReadonlyArray<Piece> {
  const input = production.source.input;
  const pieces: Piece[] = [];
  let cursor = 0;
  for (const span of production.spans) {
    const startOffset = findSpanStart(input, span, cursor);
    if (startOffset === null) {
      // Optional/repeats-min-0 span absent from this example: skip both
      // the separator and the slot. Matches the legacy algorithm.
      if (isAbsentAllowed(span)) continue;
      throw new Error(
        `synth-source: required span '${span.name ?? span.text ?? '<unnamed>'}' not found in example '${truncate(input)}'`,
      );
    }
    const sepText = input.slice(cursor, startOffset);
    if (sepText.length > 0) {
      pieces.push({ kind: 'literal', text: canonicalSeparator(sepText) });
    }
    pieces.push(contributionOf(span));
    if (span.text) cursor = startOffset + span.text.length;
  }
  return pieces;
}

function contributionOf(span: ResolvedSpan): Piece {
  if (span.recursiveRoles.length > 0) {
    if (!span.name) throw new Error('synth-source: recursive span without name');
    return { kind: 'slot', ref: span.name };
  }
  const isUntil = span.modifiers.some(
    (m) => m.kind === 'until' || m.kind === 'rawUntil',
  );
  if (isUntil) {
    if (!span.name) throw new Error('synth-source: until-span without name');
    return { kind: 'slot', ref: span.name };
  }
  if (span.class !== 'literal') {
    if (!span.name) {
      throw new Error(`synth-source: classed span without name (class '${span.class}')`);
    }
    return { kind: 'slot', ref: span.name };
  }
  if (span.name) return { kind: 'slot', ref: span.name };
  if (!span.text) throw new Error('synth-source: unnamed literal span without text');
  return { kind: 'literal', text: span.text };
}

function piecesToTemplate(pieces: ReadonlyArray<Piece>): string {
  // Render as a JS tagged-template literal: tpl`<text and ${$.refs}>`.
  // The literal must escape backslash, backtick, and `${` sequences.
  let out = 'tpl`';
  for (const p of pieces) {
    if (p.kind === 'literal') {
      out += escapeTemplateLiteral(p.text);
    } else {
      out += '${$.' + p.ref + '}';
    }
  }
  out += '`';
  return out;
}

function escapeTemplateLiteral(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function isAbsentAllowed(span: ResolvedSpan): boolean {
  for (const m of span.modifiers) {
    if (m.kind === 'optional') return true;
    if (m.kind === 'repeats' && (m.min === undefined || m.min === 0)) return true;
  }
  return false;
}

function findSpanStart(input: string, span: ResolvedSpan, cursor: number): number | null {
  if (!span.text) return null;
  const idx = input.indexOf(span.text, cursor);
  return idx < 0 ? null : idx;
}

function canonicalSeparator(_separator: string): string {
  // Any inter-span whitespace collapses to a single space. Matches the
  // canonical-separator rule from the legacy source-template pass and the
  // current __rebuild_<Production> subroutine.
  return ' ';
}

// ---------------------------------------------------------------------------
// Source insertion
// ---------------------------------------------------------------------------

function insertRenderSourceCallAt(
  src: string,
  exEnd: number,
  templateLiteral: string,
): string | null {
  // Walk forward from exEnd to find the matching `.build()` for this chain.
  // Track paren/brace depth so we don't trip on nested calls. The chain is
  // `ex(...).foo(...).bar(...)`...`.build()` — at depth 0 we look for the
  // literal `.build()` token.
  const buildIdx = findMatchingBuild(src, exEnd);
  if (buildIdx < 0) return null;
  // Determine indentation of the `.build()` line — we'll match it for the
  // newly inserted .render('source', ...) call so it nests cleanly.
  const lineStart = src.lastIndexOf('\n', buildIdx) + 1;
  const indent = src.slice(lineStart, buildIdx).match(/^[ \t]*/)?.[0] ?? '      ';
  const insertion = `${indent}.render('source', ${templateLiteral})\n`;
  return src.slice(0, lineStart) + insertion + src.slice(lineStart);
}

function findExCallFrom(
  src: string,
  input: string,
  fromIndex: number,
): [number, number] | null {
  // Match ex(<input>) at-or-after fromIndex. We accept either quote style.
  // The earliest qualifying match wins.
  //
  // Inputs containing chars JS would print as backslash-escapes (\n, \t,
  // \r, \f, \v, \b) cannot be matched against `ex('${input}')` directly
  // because the source has the two-character escape form while `input`
  // carries the single control char. For those inputs we ALSO try the
  // JS-escaped form against each quote style — schemas may use either
  // 'single' or "double" quotes; JSON.stringify only emits the double
  // form, which misses the single-quote case (e.g. markdown's document
  // example).
  const escSingle = jsEscape(input, "'");
  const escDouble = jsEscape(input, '"');
  const candidates: string[] = [];
  if (!input.includes("'") && !input.includes('\\') && !needsJsEscape(input)) candidates.push(`ex('${input}')`);
  if (!input.includes('"') && !input.includes('\\') && !needsJsEscape(input)) candidates.push(`ex("${input}")`);
  candidates.push(`ex('${escSingle}')`);
  candidates.push(`ex("${escDouble}")`);
  candidates.push(`ex(${JSON.stringify(input)})`);
  let best: [number, number] | null = null;
  for (const needle of candidates) {
    const idx = src.indexOf(needle, fromIndex);
    if (idx < 0) continue;
    if (best === null || idx < best[0]) best = [idx, idx + needle.length];
  }
  return best;
}

function needsJsEscape(input: string): boolean {
  return /[\n\r\t\f\v\b]/.test(input);
}

function jsEscape(input: string, quote: string): string {
  let out = '';
  for (const ch of input) {
    if (ch === '\\') out += '\\\\';
    else if (ch === quote) out += '\\' + quote;
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\f') out += '\\f';
    else if (ch === '\v') out += '\\v';
    else if (ch === '\b') out += '\\b';
    else out += ch;
  }
  return out;
}

function findMatchingBuild(src: string, fromIdx: number): number {
  // Naive but adequate scan: walk forward, tracking depth of (), [], {} and
  // skipping over string literals (single/double/backtick). Return the
  // offset of `.build()` found at depth 0 relative to where we started.
  let i = fromIdx;
  let depth = 0;
  const len = src.length;
  while (i < len) {
    const ch = src[i]!;
    if (ch === '/' && src[i + 1] === '/') {
      // line comment
      const nl = src.indexOf('\n', i);
      i = nl < 0 ? len : nl + 1;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? len : end + 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      i = skipQuoted(src, i, ch);
      continue;
    }
    if (ch === '`') {
      i = skipBacktick(src, i);
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; i++; continue; }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      i++;
      if (depth < 0) return -1;
      continue;
    }
    if (depth === 0 && ch === '.' && src.startsWith('.build()', i)) {
      return i;
    }
    i++;
  }
  return -1;
}

function skipQuoted(src: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === '\\') { i += 2; continue; }
    if (ch === quote) return i + 1;
    i++;
  }
  return src.length;
}

function skipBacktick(src: string, start: number): number {
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === '\\') { i += 2; continue; }
    if (ch === '$' && src[i + 1] === '{') {
      // skip nested expression
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        const c = src[i]!;
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === "'" || c === '"') i = skipQuoted(src, i, c) - 1;
        else if (c === '`') i = skipBacktick(src, i) - 1;
        i++;
      }
      continue;
    }
    if (ch === '`') return i + 1;
    i++;
  }
  return src.length;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSchemaDef(value: unknown): boolean {
  return (
    typeof value === 'object'
    && value !== null
    && typeof (value as { rootType?: unknown }).rootType === 'string'
    && Array.isArray((value as { examples?: unknown }).examples)
  );
}

function truncate(s: string): string {
  return s.length <= 40 ? s : `${s.slice(0, 37)}...`;
}

await main();
