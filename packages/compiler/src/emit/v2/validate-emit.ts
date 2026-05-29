// Validator-hook codegen module.
//
// Emits the public validate() function, its per-validator import block, AND
// the inline-validator composition pass output. Returns
// { imports, body, inlineBlock } so the caller can place imports at file
// head, the function body in the public-api section, and `inlineBlock`
// (containing compiled sub-schemas + __validator_N aliases) between the
// runtime helpers and the parent's parse functions.
//
// Strategy: when {validate: true} is passed, parse in 'raws' mode to get
// source offsets on every node. Walk the raws AST looking for nodes whose
// __production matches a validation rule's nodeType. For each match, check
// if the node's matchField is in the rule's matchValues, then call the
// validator on the node's field value.
//
// Inline validators — when a rule's validator is `{ kind: 'inline', schema }`
// (Phase C, see types.ts) — are compiled in-place. Each unique sub-schema
// (by reference identity) is compiled once with a unique `__vN_` symbolPrefix
// in emitMode='inline'; its internal parse functions are concatenated into
// the parent's source after the shared runtime block. Per RULE (not per
// unique schema, since multiple rules can reference the same sub-schema)
// we emit a `__validator_N` alias that builds a fresh `State`, runs the
// prefixed root parse fn, and throws when the parse returned null or
// consumed less than the full input — mirroring the existing `__cc_validate`
// shape baked into the css generated parser snapshot prior to this work.

import type { SchemaDef, ValidationRuleDef } from '@parser2/parser';
import { generateParser } from '../../index.ts';
import type { InferredSchema } from '../../model.ts';
import { jsString } from '../strings.ts';
import { emitStateInit } from './state-init.ts';

export type EmitValidateResult = {
  readonly imports: string;
  readonly body: string;
  readonly inlineBlock: string;
};

export function emitValidate(
  schema: InferredSchema,
  rootFn: string,
): EmitValidateResult {
  const rules = schema.validation?.rules ?? [];
  if (rules.length === 0) {
    return {
      imports: '',
      body: emitValidateStub(rootFn, schema.packageName),
      inlineBlock: '',
    };
  }

  // ── Import-style validators ───────────────────────────────────────────
  // Collect unique (module, exportName) pairs from import-style rules,
  // assign stable local aliases. Key is "module::exportName" → "<alias>".
  //
  // ── Inline-style validators ──────────────────────────────────────────
  // Collect unique SchemaDef references and assign a unique `__vN_`
  // symbolPrefix to each. Reference-identity deduplication is intentional:
  // two rules pointing at the same sub-schema share one compiled copy in
  // the parent's source, but each rule still gets its own `__validator_N`
  // alias (the alias body resolves to the SAME prefixed parse fn — that's
  // fine, the dispatch switch references the alias number, not the
  // prefix).
  //
  // Aliases are numbered per-RULE in rule-iteration order, so that the
  // dispatch switch's references stay in sync with the alias declarations
  // regardless of validator kind. Import rules and inline rules share the
  // same numbering pool.
  const importMap = new Map<string, number>(); // key -> alias index
  const inlineSchemas = new Map<SchemaDef, number>(); // schema -> prefix index
  const aliasByRule = new Map<ValidationRuleDef, number>();
  for (let i = 0; i < rules.length; i++) {
    aliasByRule.set(rules[i]!, i);
  }
  for (const r of rules) {
    if (r.validator.kind === 'import') {
      const key = `${r.validator.module}::${r.validator.exportName}`;
      if (!importMap.has(key)) importMap.set(key, importMap.size);
    } else {
      if (!inlineSchemas.has(r.validator.schema)) {
        inlineSchemas.set(r.validator.schema, inlineSchemas.size);
      }
    }
  }

  // ── Emit import-style alias bindings ─────────────────────────────────
  // Imports rename `validate as __validator_<ruleIdx>` for every rule whose
  // validator is an import. When two rules share the same import, we emit
  // separate `validate as __validator_A` and `validate as __validator_B`
  // bindings for clarity at the call site (the dispatch switch uses the
  // alias by rule-index, not by import-key).
  const importLines: string[] = [];
  for (const r of rules) {
    if (r.validator.kind !== 'import') continue;
    const ruleIdx = aliasByRule.get(r)!;
    importLines.push(
      `import { ${r.validator.exportName} as __validator_${ruleIdx} } from ${jsString(r.validator.module)};`,
    );
  }

  // ── Compile each unique inline sub-schema and emit its source ────────
  // Each gets a unique `__vN_` prefix. We call back into `generateParser`
  // with `emitMode: 'inline'` so the recursive emit suppresses its own
  // header, runtime helpers, and public exports.
  const inlineParts: string[] = [];
  for (const [subSchema, idx] of inlineSchemas) {
    const prefix = `__v${idx}_`;
    const subSource = generateParser(subSchema, undefined, {
      packageName: subSchema.rootType,
      symbolPrefix: prefix,
      emitMode: 'inline',
    });
    inlineParts.push(
      `// ── Inlined validator: ${subSchema.rootType} (prefix ${prefix}) ──`,
      subSource.trimEnd(),
    );
  }

  // ── Emit __validator_N alias bodies ──────────────────────────────────
  // For inline rules: alias N builds a fresh `State` and runs the
  // sub-schema's prefixed root parse fn; partial parse or null return
  // raises a SyntaxError via `syntaxErrorAt`. State struct shape mirrors
  // V2_RUNTIME's declaration including the indent fields.
  const inlineAliases: string[] = [];
  for (const r of rules) {
    if (r.validator.kind !== 'inline') continue;
    const ruleIdx = aliasByRule.get(r)!;
    const prefix = `__v${inlineSchemas.get(r.validator.schema)!}_`;
    const rootParse = `${prefix}parse${r.validator.schema.rootType}`;
    inlineAliases.push(
      `function __validator_${ruleIdx}(input: string): void {`,
      emitStateInit('__state', 'fast'),
      `  const __r = ${rootParse}(__state);`,
      `  if (__r === null || __state.pos !== input.length) {`,
      `    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);`,
      `  }`,
      `}`,
    );
  }

  const inlineBlock = inlineParts.length === 0 && inlineAliases.length === 0
    ? ''
    : [
        inlineParts.join('\n\n'),
        inlineAliases.join('\n'),
        '// ── End inlined validators ──',
      ].filter((p) => p !== '').join('\n\n');

  // ── Build the dispatch switch (one if-block per nodeType) ────────────
  // Group rules by nodeType so the walker only does N production-prefix
  // comparisons per node visit (one per distinct nodeType), not per rule.
  const byNode = new Map<string, ValidationRuleDef[]>();
  for (const r of rules) {
    const list = byNode.get(r.nodeType) ?? [];
    list.push(r);
    byNode.set(r.nodeType, list);
  }

  const switchCases: string[] = [];
  for (const [nodeType, nodeRules] of byNode) {
    const inner: string[] = [];
    for (const r of nodeRules) {
      const ruleIdx = aliasByRule.get(r)!;
      const valuesArr = '[' + r.matchValues.map((v) => jsString(v)).join(', ') + ']';
      inner.push(
        `    if (${valuesArr}.includes(__n[${jsString(r.matchField)}])) {`,
        `      try { __validator_${ruleIdx}(String(__n[${jsString(r.field)}] ?? '')); }`,
        `      catch (__e) {`,
        `        const __off = (__n.source && __n.source.start && typeof __n.source.start.offset === 'number')`,
        `          ? __n.source.start.offset : 0;`,
        `        throw validatorErrorAt(input, __off, __e);`,
        `      }`,
        `    }`,
      );
    }
    switchCases.push(
      `  if (__prod === ${jsString(nodeType)} || __prod.startsWith(${jsString(nodeType + '#')})) {`,
      ...inner,
      `  }`,
    );
  }

  const body = `export function validate(input: string, options?: ParseOptions): void {
  // Syntax check: parse in fast mode first (will throw SyntaxError on bad syntax).
  __parse(input, { mode: 'fast' });
  // Validation check: only runs when opt-in.
  if (!options?.validate) return;
  // Parse in raws mode to get source offsets for error reporting.
  const __rawsAst = __parse(input, { mode: 'raws' });
  __walkAndValidate(input, __rawsAst);
}

function __walkAndValidate(input: string, node: unknown): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const child of node) __walkAndValidate(input, child);
    return;
  }
  if (typeof node !== 'object') return;
  const __n = node as Record<string, unknown>;
  const __prod = typeof __n['__production'] === 'string' ? __n['__production'] : '';
${switchCases.join('\n')}
  // Recurse into all object-valued children.
  for (const __key in __n) {
    const __child = __n[__key];
    if (__child !== null && typeof __child === 'object') __walkAndValidate(input, __child);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: ${jsString(`@parser2/${schema.packageName}`)},
  exportName: 'validate',
};`;

  return { imports: importLines.join('\n'), body, inlineBlock };
}

function emitValidateStub(rootFn: string, packageName: string): string {
  return `export function validate(input: string, options?: ParseOptions): void {
${emitStateInit('__state', 'fast')}
  const __result = ${rootFn}(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: ${jsString(`@parser2/${packageName}`)},
  exportName: 'validate',
};`;
}
